import { MatchmakingRank } from 'csgostatsgg-scraper';
import moment from 'moment';
import weightedAvg from '@stdlib/stats-incr-wmean';
import { PlayerData } from '../gather';
import { Analysis } from './common';
import L from '../common/logger';
import { ScorePlotData } from '../common/types';
import { range } from '../common/util';

// TODO: Find all derank periods, scale by age, and add up scores
export interface RankAnalysis extends Analysis {
  currentRank?: string;
  bestRankEver?: string;
  bestRankAgo?: string;
  bestRankPastYear?: string;
  weightedRank?: string;
  worstDerankRate?: string;
}

const rankName: Record<MatchmakingRank, string> = {
  1: 'Silver 1 (1)',
  2: 'Silver 2 (2)',
  3: 'Silver 3 (3)',
  4: 'Silver 4 (4)',
  5: 'Silver Elite (5)',
  6: 'Silver Elite Master (6)',
  7: 'Gold Nova 1 (7)',
  8: 'Gold Nova 2 (8)',
  9: 'Gold Nova 3 (9)',
  10: 'Gold Nova Master (10)',
  11: 'Master Guardian 1 (11)',
  12: 'Master Guardian 2 (12)',
  13: 'Master Guardian Elite (13)',
  14: 'Distinguished Master Guardian (14)',
  15: 'Legendary Eagle (15)',
  16: 'Legendary Eagle Master (16)',
  17: 'Supreme Master First Class (17)',
  18: 'Global Elite (18)',
};
const MIN_DERANK_AMOUNT = 3;

const WORST_DERANK_RATE_SCORE_MUILTIPLIER = -10;
const WORST_DERANK_RATE_SCORE_OFFSET = 15;
const WEGITHED_RANK_DIFFERENCE_SCORE_MUILTIPLIER = -35;
const WEGITHED_RANK_DIFFERENCE_SCORE_OFFSET = 40;
const NO_DERANK_SCORE = 0;
const NO_DATA_SCORE = -10;
const YEARS_AGO_WT_ZERO_POINT = 5;

// TODO: scale worst derank rate to how long ago it occurred (like VAC ban)
const worstDerankRateScoreFunction = (deranksPerMonth: number): number => {
  // score = Min(-10 * deranksPerMonth + 15, 0)
  // Drop 1 rank in a month: 0
  // Drop 2 ranks in a month: -5
  // Drop 3 ranks in a month: -15
  // Drop 4 ranks in a month: -25
  return Math.min(
    deranksPerMonth * WORST_DERANK_RATE_SCORE_MUILTIPLIER + WORST_DERANK_RATE_SCORE_OFFSET,
    0
  );
};

const weightedRankDifferenceScoreFunction = (weightedRankDifference: number): number => {
  // score = Min(-35 * weightedRankDifference + 40, 0)
  // +1 rank: 0
  // +2 rank: -30
  // +3 rank: -65
  // +4 rank: -100
  return Math.min(
    weightedRankDifference * WEGITHED_RANK_DIFFERENCE_SCORE_MUILTIPLIER +
      WEGITHED_RANK_DIFFERENCE_SCORE_OFFSET,
    0
  );
};

export const analyzeRank = (player: PlayerData): RankAnalysis => {
  let bestRankValue = player.csgoStatsPlayer?.summary.bestRank;
  let currentRankValue: MatchmakingRank | undefined = player.csgoStatsPlayer?.summary.currentRank;
  const rawData = player.csgoStatsPlayer?.graphs?.rawData;
  let score: number = NO_DATA_SCORE;
  let worstDerankRate: string | undefined;
  let bestRankAgo: string | undefined;

  let bestRankPastYear: string | undefined;
  let weightedRankValue: number | undefined;
  let weightedRank: string | undefined;
  let derankRateScore: number;
  let weightedRankDifferenceScore: number;
  const link = `https://csgostats.gg/player/${player.steamId.getSteamID64()}?type=comp#/graphs`;

  if (rawData) {
    const reversedRawData = rawData.reverse();

    // CURRENT RANK REFINEMENT

    reversedRawData.some((point) => {
      if (point.rank >= 0) {
        currentRankValue = point.rank;
        return true;
      }
      return false; // Continue loop
    });

    // BEST RANK REFINEMENT

    let recentBestRankIndex = 0;
    const recentBestRankPoint = reversedRawData.reduce((recentBestRank, point, index) => {
      if (point.rank !== 0 && point.rank > recentBestRank.rank) {
        recentBestRankIndex = index;
        return point;
      }
      return recentBestRank;
    });
    bestRankValue = recentBestRankPoint ? recentBestRankPoint.rank : bestRankValue;

    if (bestRankValue && currentRankValue) {
      // WEIGHTED RANK

      const accumulator = weightedAvg();
      weightedRankValue = reversedRawData.reduce((acc, point) => {
        if (point.rank <= 0) return acc;
        const yearsAgo = moment().diff(moment(point.date, 'YYYY-MM-DD HH:mm:ss'), 'years', true);
        const weight = Math.max(0, YEARS_AGO_WT_ZERO_POINT - yearsAgo);
        return accumulator(point.rank, weight) as number;
      }, 0);
      weightedRank = weightedRankValue
        ? rankName[Math.round(weightedRankValue) as MatchmakingRank].replace(
            /\(\d+\)/,
            `(${weightedRankValue.toFixed(1)})`
          )
        : undefined;

      const weightedRankDifference = weightedRankValue - currentRankValue;
      weightedRankDifferenceScore = weightedRankDifferenceScoreFunction(weightedRankDifference);

      L.debug({
        weightedRankDifference,
        weightedRankDifferenceScore,
      });

      // BEST RANK PAST YEAR

      let bestRankPastYearValue: MatchmakingRank | undefined;
      reversedRawData.some((point) => {
        if (moment().diff(moment(point.date, 'YYYY-MM-DD HH:mm:ss'), 'years', true) > 1) {
          return true; // Break from loop
        }
        if (point.rank !== 0) {
          if (!bestRankPastYearValue || point.rank > bestRankPastYearValue) {
            bestRankPastYearValue = point.rank;
          }
        }
        return false; // Continue loop
      });
      bestRankPastYear = bestRankPastYearValue ? rankName[bestRankPastYearValue] : undefined;

      // DERANK
      if (recentBestRankPoint.rank > currentRankValue) {
        // ⬆ This should catch the reduce on an empty array
        const recentWorstRankPoint = reversedRawData
          .slice(0, recentBestRankIndex)
          .reduce((worstRank, point) => {
            if (point.rank !== 0 && point.rank <= worstRank.rank) return point;
            return worstRank;
          });
        const derankAmount = recentBestRankPoint.rank - recentWorstRankPoint.rank;
        if (derankAmount < MIN_DERANK_AMOUNT) {
          // Only count larger derank intervals
          derankRateScore = NO_DERANK_SCORE;
        } else {
          const bestRankDate = moment(recentBestRankPoint.date, 'YYYY-MM-DD HH:mm:ss'); // 2017-10-27 00:51:10
          bestRankAgo = bestRankDate.fromNow();
          const worstRankDate = moment(recentWorstRankPoint.date, 'YYYY-MM-DD HH:mm:ss'); // 2017-10-27 00:51:10
          const derankDuration = worstRankDate.diff(bestRankDate, 'months', true); // Returns floating point number of months
          const derankRateValue = derankAmount / derankDuration;

          derankRateScore = worstDerankRateScoreFunction(derankRateValue);
          worstDerankRate = `${derankAmount} ranks ${bestRankDate.to(worstRankDate)}`;

          L.debug({
            bestRankDate: bestRankDate.toISOString(),
            worstRankDate: worstRankDate.toISOString(),
            derankDuration,
            derankRateValue,
            derankRateScore,
          });
        }
      } else {
        derankRateScore = NO_DERANK_SCORE;
      }
      score = Math.min(derankRateScore + weightedRankDifferenceScore, 0); // Cap at 0
      L.debug({
        rankScore: score,
      });
    }
  }

  const currentRank: string | undefined = currentRankValue ? rankName[currentRankValue] : undefined;
  const bestRankEver: string | undefined = bestRankValue ? rankName[bestRankValue] : undefined;
  return {
    currentRank,
    weightedRank,
    bestRankPastYear,
    bestRankEver,
    bestRankAgo,
    worstDerankRate,
    score,
    link,
  };
};

const plotDerankRateData = (): ScorePlotData => {
  const x = range(0, 20);
  const y = x.map((xVal) => worstDerankRateScoreFunction(xVal));
  return {
    title: 'Worst Derank Period Rate',
    x,
    xAxisLabel: 'Deranks per month',
    y,
  };
};

const plotWeightedRankDifferenceData = (): ScorePlotData => {
  const x = range(-5, 17);
  const y = x.map((xVal) => weightedRankDifferenceScoreFunction(xVal));
  return {
    title: 'Weighted Rank Difference',
    x,
    xAxisLabel: 'Weighted rank - current rank',
    y,
  };
};

export const rankPlot: ScorePlotData[] = [plotDerankRateData(), plotWeightedRankDifferenceData()];
