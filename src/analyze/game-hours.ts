import { ScorePlotData } from '../common/types';
import { range } from '../common/util';
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

const scoreFunction = (totalHours: number): number => {
  let score: number;
  score = Math.min(totalHours, MAXIMUM_HOURS) * HOUR_SCORE_MULTIPLIER + OFFSET;
  if (score < 0) score *= NEGATIVE_SCORE_MULTIPLIER; // Don't give a large bonus for high hours, but big impact if now hours
  return score;
};

export const analyzeGameHours = (player: PlayerData): GameHoursAnalysis => {
  const { ownedGames, recentGames } = player;
  const gameDetails =
    ownedGames?.find((game) => game.appID === 730) ||
    recentGames?.find((game) => game.appID === 730);
  let total: number | undefined;
  let last2Weeks: number | undefined;
  let score: number;
  if (gameDetails && gameDetails.playTime > 0) {
    total = gameDetails.playTime / 60;
    last2Weeks = gameDetails.playTime2 / 60;
    score = scoreFunction(total);
  } else {
    score = PRIVATE_PROFILE_SCORE;
  }
  return {
    total,
    last2Weeks,
    score,
  };
};

const plotData = (): ScorePlotData => {
  const x = range(0, 1100);
  const y = x.map((xVal) => scoreFunction(xVal));
  return {
    title: 'CS:GO Game Hours',
    x,
    xAxisLabel: 'Total Hours In-Game',
    y,
  };
};
export const gameHoursPlot: ScorePlotData[] = [plotData()];
