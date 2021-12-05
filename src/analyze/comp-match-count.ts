import { PlayerData } from '../gather';
import { Analysis } from './common';

export interface CompMatchWinsAnalysis extends Analysis {
  count?: number;
}

const MATCH_SCORE_MULTIPLIER = 0.1; // 10 points for 100 wins
const MAXIMUM_WINS = 100;
const OFFSET = -3; // 30 wins gets 0
const NEGATIVE_SCORE_MULTIPLIER = 10;
const NO_DATA_SCORE = -2;

export const analyzeCompMatchWins = (player: PlayerData): CompMatchWinsAnalysis => {
  const { csgoStatsPlayer } = player;
  const count = csgoStatsPlayer?.summary.competitiveWins;
  let score: number;
  if (count) {
    score = Math.min(count, MAXIMUM_WINS) * MATCH_SCORE_MULTIPLIER + OFFSET;
    if (score < 0) score *= NEGATIVE_SCORE_MULTIPLIER; // Don't give a large bonus for high wins, but big impact if now wins
  } else {
    score = NO_DATA_SCORE;
  }
  return {
    count,
    score,
  };
};
