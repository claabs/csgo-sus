import { PlayerData } from '../gather';
import { Analysis } from './common';

export interface OwnedGamesAnalysis extends Analysis {
  ownedGames?: number;
}

const VALUE_SCORE_MULTIPLIER = 1; // 100 points for 100 games
const MAXIMUM_GAMES = 100;
const OFFSET = -4; // 4 games gets 0
const PRIVATE_PROFILE_SCORE = -2;

export const analyzeOwnedGames = (player: PlayerData): OwnedGamesAnalysis => {
  const games = player.ownedGames;
  let ownedGames: number | undefined;
  let score: number;
  if (games?.length) {
    ownedGames = games.length;
    const cappedOwnedGames = ownedGames >= MAXIMUM_GAMES ? MAXIMUM_GAMES : ownedGames; // Cap at maximum value
    score = cappedOwnedGames * VALUE_SCORE_MULTIPLIER + OFFSET;
  } else {
    score = PRIVATE_PROFILE_SCORE;
  }
  return {
    ownedGames,
    score,
  };
};
