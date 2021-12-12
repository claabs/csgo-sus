import { ScorePlotData } from '../common/types';
import { range } from '../common/util';
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

const scoreFunction = (numWins: number): number => {
  let score: number;
  score = Math.min(numWins, MAXIMUM_WINS) * MATCH_SCORE_MULTIPLIER + OFFSET;
  if (score < 0) score *= NEGATIVE_SCORE_MULTIPLIER; // Don't give a large bonus for high wins, but big impact if now wins
  return score;
};

export const analyzeCompMatchWins = (player: PlayerData): CompMatchWinsAnalysis => {
  const { csgoStatsPlayer } = player;
  const count = csgoStatsPlayer?.summary.competitiveWins;
  let score: number;
  if (count) {
    score = scoreFunction(count);
  } else {
    score = NO_DATA_SCORE;
  }
  return {
    count,
    score,
  };
};

const plotData = (): ScorePlotData => {
  const x = range(0, 150);
  const y = x.map((xVal) => scoreFunction(xVal));
  return {
    title: 'Competitive Wins',
    x,
    xAxisLabel: 'Competitive Wins',
    y,
  };
};
export const compMatchWinsPlot: ScorePlotData[] = [plotData()];
