import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { uniq } from "lodash";
import { Player } from "./types/Player";
import { Hint } from "./types/Hint";

const app = admin.initializeApp();

export const changeVote = functions.https.onCall(async (data, context) => {
  // @ts-ignore
  const uid = context.auth.uid;

  const lobbyId = data.lobbyId as string;
  if (!lobbyId) {
    throw new Error("invalid lobbyId " + lobbyId);
  }
  const vote = data.vote as string;
  if (!vote) {
    throw new Error("invalid vote " + vote);
  }
  let player = await getPlayerByLobbyAndId(lobbyId, uid);
  if (!player) {
    throw new Error("player " + uid + " not found in lobby " + lobbyId);
  }
  const currentTeam = await getCurrentTeam(lobbyId);
  if (player.team !== currentTeam) {
    throw new Error("player " + uid + " is playing out of turn in " + lobbyId);
  }
  await app
    .firestore()
    .doc(`lobbies/${lobbyId}/players/${uid}`)
    .update({ vote: vote });

  return "Player voting for card...";
});

export const joinGame = functions.https.onCall(async (data, context) => {
  // @ts-ignore
  const uid = context.auth.uid;
  // @ts-ignore
  const name = context.auth.token.name || null;
  const player: Player = {
    vote: "",
    team: "red",
    name: name,
    color: "grey",
  };
  const lobbyId = data.lobbyId as string;
  if (!lobbyId) {
    throw new Error("invalid lobbyId " + lobbyId);
  }
  let existingPlayer = await getPlayerByLobbyAndId(lobbyId, uid);
  if (existingPlayer) {
    throw new Error("player " + uid + " already joined lobby " + lobbyId);
  }
  await app.firestore().doc(`lobbies/${lobbyId}/players/${uid}`).create(player);
  return "successfully joined game";
});

async function revealCard(cardId: string, lobbyId: string) {
  console.log("revealing color for card " + cardId);

  let snapshot = await app
    .firestore()
    .doc(`lobbies/${lobbyId}/wordOwners/${cardId}`)
    .get();

  if (!snapshot) {
    throw new Error("no wordOwner found with id " + cardId);
  }
  // @ts-ignore
  const team = snapshot.data().team;
  await app
    .firestore()
    .doc(`lobbies/${lobbyId}/words/${cardId}`)
    .update({ team: team });
  return;
}

//Trigger on vote change in public gamestate
export const handleVoteChange = functions
  .region("europe-west1")
  .firestore.document("lobbies/{lobbyId}/players/{playerId}")
  .onUpdate(async (change, context) => {
    console.log("starting revealCard");
    const updatedPlayer = change.after.data();
    if (!updatedPlayer.vote) {
      console.log("nothing to do, votingResult is empty");
      return;
    }
    const lobbyId = context.params.lobbyId;
    const players = await getPlayersByLobbyAndTeam(lobbyId, updatedPlayer.team);
    const votes = players.map((player) => player.vote);
    if (votes.length < players.length) {
      console.log("not enough players have voted");
      return;
    }
    let uniqVotes = uniq(votes);
    if (uniqVotes.length > 1) {
      console.log("not all players voted for the same action");
      return;
    }
    const votingResult = uniqVotes[0];
    console.log("players voted for action " + votingResult);
    if (!votingResult) {
      console.log("action undefined");
      return;
    } else if (votingResult === "skip") {
      await skipTurn(lobbyId);
      await resetVotes(players, lobbyId);
      return;
    } else {
      await revealCard(votingResult, lobbyId);
    }
  });

export const addHint = functions.https.onCall(async (data, context) => {
  // @ts-ignore
  const uid = context.auth.uid;
  const lobbyId = data.lobbyId as string;
  if (!lobbyId) {
    throw new Error("invalid lobbyId " + lobbyId);
  }
  if (!data.hintText || data.hintText === "") {
    //TODO: Add further validation
    throw new Error(`no valid hint given`);
  }
  const player = await getPlayerByLobbyAndId(lobbyId, uid);
  if (!player) {
    throw new Error(`player ${uid} not found in lobby ${lobbyId}`);
  }
  if (player.guide !== "true") {
    throw new Error(`player ${uid} is not guide in lobby ${lobbyId}`);
  }
  const currentTeam = await getCurrentTeam(lobbyId);
  if (player.team !== currentTeam) {
    throw new Error(`player ${uid} is playing out of turn in ${lobbyId}`);
  }
  const hint: Hint = {
    text: data.hintText,
    team: player.team,
  };
  await app.firestore().collection(`lobbies/${lobbyId}/hints/`).add(hint);
});

const getPlayersByLobbyAndTeam = async (
  lobbyId: string,
  team: string
): Promise<Player[]> => {
  const snapshot = await app
    .firestore()
    .collection(`lobbies/${lobbyId}/players`)
    .where("team", "==", team)
    .get();
  if (!snapshot || snapshot.size == 0) {
    throw new Error("no players found for lobby " + lobbyId);
  }
  const players: Player[] = [];
  snapshot.docs.map((doc) => {
    const player = doc.data() as Player;
    player.id = doc.id;
    players.push(player);
  });
  return players;
};

const getPlayerByLobbyAndId = async (
  lobbyId: string,
  playerId: string
): Promise<Player | undefined> => {
  const snapshot = await app
    .firestore()
    .doc(`lobbies/${lobbyId}/players/${playerId}`)
    .get();
  if (!snapshot || !snapshot.data()) {
    return undefined;
  }
  const player = snapshot.data() as Player;
  player.id = snapshot.id;
  return player;
};

const getCurrentTeam = async (lobbyId: string): Promise<String> => {
  const snapshot = await app
    .firestore()
    .collection("lobbies")
    .doc(lobbyId)
    .get();

  const data = snapshot.data();
  if (!data) {
    throw new Error("no lobby found with id " + lobbyId);
  }
  return data.currentTeam;
};

async function resetVotes(players: Player[], lobbyId: string) {
  const tasks: Promise<any>[] = [];
  players.forEach((player) => {
    tasks.push(
      app
        .firestore()
        .doc(`lobbies/${lobbyId}/players/${player.id}`)
        .update({ vote: "" })
    );
  });
  return Promise.all(tasks);
}

async function skipTurn(lobbyId: string) {
  console.log("skipping turn");
  const currentTeam = await getCurrentTeam(lobbyId);
  let nextTeam;
  if (currentTeam === "blue") {
    nextTeam = "red";
  } else {
    nextTeam = "blue";
  }
  await app
    .firestore()
    .doc(`lobbies/${lobbyId}`)
    .update({ currentTeam: nextTeam });
}
