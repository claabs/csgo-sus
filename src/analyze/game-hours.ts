import { PlayerData } from '../gather';
import { Analysis } from './common';

export interface GameHoursAnalysis extends Analysis {
  total?: number;
  last2Weeks?: number;
}

const HOUR_SCORE_MULTIPLIER = 0.01; // 10 points for 1000 hour
const MAXIMUM_HOURS = 1000;
const OFFSET = -1; // 100 hours gets 0
const NEGATIVE_SCORE_MULTIPLIER = 10;
const PRIVATE_PROFILE_SCORE = -2;

export const analyzeGameHours = (player: PlayerData): GameHoursAnalysis => {
  const { ownedGames, recentGames } = player;
  const gameDetails =
    ownedGames?.find((game) => game.appID === 730) ||
    recentGames?.find((game) => game.appID === 730);
  let total: number | undefined;
  let last2Weeks: number | undefined;
  let score: number;
  if (gameDetails) {
    total = gameDetails.playTime / 60;
    last2Weeks = gameDetails.playTime2 / 60;
    score = Math.min(total, MAXIMUM_HOURS) * HOUR_SCORE_MULTIPLIER + OFFSET;
    if (score < 0) score *= NEGATIVE_SCORE_MULTIPLIER; // Don't give a large bonus for high hours, but big impact if now hours
  } else {
    score = PRIVATE_PROFILE_SCORE;
  }
  return {
    total,
    last2Weeks,
    score,
  };
};
