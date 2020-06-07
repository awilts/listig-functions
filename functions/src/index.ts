import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { uniq } from "lodash";
import { Player } from "./types/Player";
import { Gamestate } from "./types/Gamestate";

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
  .firestore.document("players/{playerId}")
  .onUpdate(async (change, context) => {
    // @ts-ignore
    if (!change.after.data().chosenCard) {
      console.log("nothing to do, chosenCard is empty");
    }

    const gamestateResult = await getGamestateById("2fFWeq0DIlBFbE8YZMEM");
    const currentTeam = gamestateResult.currentTeam;
    let currentTeamPlayers = [];
    if (currentTeam === 0) {
      currentTeamPlayers = gamestateResult.team0players;
    } else {
      currentTeamPlayers = gamestateResult.team1players;
    }

    const players = [];
    for (const playerId in currentTeamPlayers) {
      const player = await getPlayerById(playerId);
      players.push(player);
    }

    let chosenCards = players.map((player) => player.chosenCard);
    if (chosenCards.length < currentTeamPlayers.length) {
      console.log("not enough players have chosen cards");
      return;
    }

    let uniqChosenCards = uniq(chosenCards);
    if (uniqChosenCards.length > 1) {
      console.log("not all players voted for the same card");
      return;
    }

    const chosenCard = uniqChosenCards[0];

    if (!chosenCard) {
      console.log("card undefined");
      return;
    }
    if (chosenCard === -1) {
      //TODO: skip round
      console.log("skipping round");
      return;
    }
    const MAX_CARD_ID = 19;
    if (chosenCard > MAX_CARD_ID) {
      console.log("invalid card chosen");
      return;
    }

    //TODO: reveal card color
  });

export const addHint = functions.https.onRequest(async (request, response) => {
  //check if player is code-guide
  //check if player is in current team
  //append hint to hints of players team
});

const getPlayerById = async (playerId: string): Promise<Player> => {
  const player = (
    await app.firestore().collection("players").doc(playerId).get()
  ).data();
  if (!player) {
    throw new Error("no player found!");
  }
  return player as Player;
};

const getGamestateById = async (gamestateId: string): Promise<Gamestate> => {
  const gamestateResult = (
    await app.firestore().collection("gamestate").doc(gamestateId).get()
  ).data();
  if (!gamestateResult) {
    throw new Error("no gamestate found!");
  }
  return gamestateResult as Gamestate;
};
