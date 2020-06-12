import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { uniq } from "lodash";
import { Player } from "./types/Player";

const app = admin.initializeApp();

export const voteForCard = functions.https.onRequest(
  async (request, response) => {
    //set chosenCard for player in public gamestate

    response.send("Player voting for card...");
  }
);

//Trigger on vote change in public gamestate
export const revealCard = functions
  .region("europe-west1")
  .firestore.document("lobbies/{lobbyId}/players/{playerId}")
  .onUpdate(async (change, context) => {
    console.log("starting revealCard");
    const updatedPlayer = change.after.data();
    if (!updatedPlayer.vote) {
      console.log("nothing to do, vote is empty");
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

    const chosenAction = uniqVotes[0];
    console.log("players voted for action " + chosenAction);

    if (!chosenAction) {
      console.log("action undefined");
      return;
    } else if (chosenAction === "skip") {
      const currentTeam = await getCurrentTeam(lobbyId);
      console.log(currentTeam);
      //TODO: skip round
      console.log("skipping round");

      return;
    } else {
      //TODO: reveal card color
      console.log("revealing color for card " + chosenAction);
      return;
    }
  });

export const addHint = functions.https.onRequest(async (request, response) => {
  //check if player is code-guide
  //check if player is in current team
  //append hint to hints of players team
});

// const getPlayerById = async (playerId: string): Promise<Player> => {
//   const player = (
//     await app.firestore().collection("players").doc(playerId).get()
//   ).data();
//   if (!player) {
//     throw new Error("no player found!");
//   }
//   return player as Player;
// };

const getPlayersByLobbyAndTeam = async (
  lobbyId: string,
  team: string
): Promise<Player[]> => {
  const snapshot = await app
    .firestore()
    .collection("lobbies/" + lobbyId + "/players")
    .where("team", "==", team)
    .get();
  if (!snapshot || snapshot.size == 0) {
    throw new Error("no players found for lobby " + lobbyId);
  }
  return snapshot.docs.map((doc) => doc.data()) as Player[];
};

const getCurrentTeam = async (lobbyId: string): Promise<String> => {
  const snapshot = await app
    .firestore()
    .collection("lobbies")
    .doc(lobbyId)
    .get();

  console.log({ snapshot });
  // return snapshot.docs.map((doc) => doc.data()) as Player[];
  return "foo";
};
