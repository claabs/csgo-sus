import { MatchmakingRank } from 'csgostatsgg-scraper';
import moment from 'moment';
import { PlayerData } from '../gather';
import { Analysis } from './common';
import L from '../common/logger';
import { ScorePlotData } from '../common/types';
import { range } from '../common/util';

export interface RankAnalysis extends Analysis {
  currentRank?: string;
  bestRank?: string;
  bestRankAgo?: string;
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

const BEST_TO_CURRENT_RANK_DIFF_MULTIPLIER = -15;
const BEST_TO_CURRENT_RANK_DIFF_OFFSET = 30;
const DERANK_RATE_SCORE_MUILTIPLIER = -10;
const DERANK_RATE_SCORE_OFFSET = 15;
const NO_DERANK_SCORE = 0;
const NO_DATA_SCORE = -10;

const derankRateScoreFunction = (deranksPerMonth: number): number => {
  // score = -10 * deranksPerMonth + 15
  // Drop 1 rank in a month: 5
  // Drop 2 ranks in a month: -5
  // Drop 3 ranks in a month: -15
  // Drop 4 ranks in a month: -25
  return deranksPerMonth * DERANK_RATE_SCORE_MUILTIPLIER + DERANK_RATE_SCORE_OFFSET;
};
const bestToCurrentRankDifferenceRateScoreFunction = (deranksPerYear: number): number => {
  // score = -15 * deranksPerYear + 30
  // 1 -> 15
  // 2 -> 0
  // 3 -> -15
  // 4 -> -30
  return deranksPerYear * BEST_TO_CURRENT_RANK_DIFF_MULTIPLIER + BEST_TO_CURRENT_RANK_DIFF_OFFSET;
};

export const analyzeRank = (player: PlayerData): RankAnalysis => {
  const bestRankValue = player.csgoStatsPlayer?.summary.bestRank;
  const currentRankValue = player.csgoStatsPlayer?.summary.currentRank;
  const rawData = player.csgoStatsPlayer?.graphs?.rawData;
  let score: number;
  let worstDerankRate: string | undefined;
  let bestRankAgo: string | undefined;
  const bestRank: string | undefined = bestRankValue ? rankName[bestRankValue] : undefined;
  const currentRank: string | undefined = currentRankValue ? rankName[currentRankValue] : undefined;
  if (rawData && bestRankValue && currentRankValue) {
    const reversedRawData = rawData.reverse();
    // const recentBestRankIndex = reversedRawData.findIndex((point) => point.rank === bestRank); // Can't use this since sometimes the best rank doesn't show on the graph...
    // const recentBestRankPoint = reversedRawData[recentBestRankIndex];
    let recentBestRankIndex = 0;
    const recentBestRankPoint = reversedRawData.reduce((recentBestRank, point, index) => {
      if (point.rank !== 0 && point.rank > recentBestRank.rank) {
        recentBestRankIndex = index;
        return point;
      }
      return recentBestRank;
    });
    if (recentBestRankPoint.rank > currentRankValue) {
      // ⬆ This should catch the reduce on an empty array
      const recentWorstRankPoint = reversedRawData
        .slice(0, recentBestRankIndex)
        .reduce((worstRank, point) => {
          if (point.rank !== 0 && point.rank <= worstRank.rank) return point;
          return worstRank;
        });
      const derankAmount = recentBestRankPoint.rank - recentWorstRankPoint.rank;
      if (derankAmount < 2) {
        // ⬆ this is required because a single derank in 1 day would make the rate skyrocket
        score = NO_DERANK_SCORE;
      } else {
        const bestRankDate = moment(recentBestRankPoint.date, 'YYYY-MM-DD HH:mm:ss'); // 2017-10-27 00:51:10
        bestRankAgo = bestRankDate.fromNow();
        const worstRankDate = moment(recentWorstRankPoint.date, 'YYYY-MM-DD HH:mm:ss'); // 2017-10-27 00:51:10
        const derankDuration = worstRankDate.diff(bestRankDate, 'months', true); // Returns floating point number of months
        const derankRateValue = derankAmount / derankDuration;
        const bestRankToCurrentRankDifference = recentBestRankPoint.rank - currentRankValue;
        const bestRankToCurrentRankDifferencePerYear =
          bestRankToCurrentRankDifference / moment().diff(bestRankDate, 'years', true); // Returns floating point number of months
        const bestToCurrentRankDifferenceRateScore = bestToCurrentRankDifferenceRateScoreFunction(
          bestRankToCurrentRankDifferencePerYear
        );

        const derankRateScore = derankRateScoreFunction(derankRateValue);

        score = Math.min(bestToCurrentRankDifferenceRateScore + derankRateScore, 0); // Cap at 0
        L.debug({
          bestRankDate: bestRankDate.toISOString(),
          worstRankDate: worstRankDate.toISOString(),
          derankDuration,
          derankRateValue,
          rankScore: score,
        });
        worstDerankRate = `${derankAmount} ranks ${bestRankDate.to(worstRankDate)}`;
      }
    } else {
      score = NO_DERANK_SCORE;
    }
  } else {
    score = NO_DATA_SCORE;
  }
  return {
    currentRank,
    bestRank,
    bestRankAgo,
    worstDerankRate,
    score,
  };
};

const plotDerankRateData = (): ScorePlotData => {
  const x = range(0, 20);
  const y = x.map((xVal) => derankRateScoreFunction(xVal));
  return {
    title: 'Worst Derank Period Rate',
    x,
    xAxisLabel: 'Deranks per month',
    y,
  };
};
const plotBestToCurrentRankDifferenceRateData = (): ScorePlotData => {
  const x = range(0, 20);
  const y = x.map((xVal) => bestToCurrentRankDifferenceRateScoreFunction(xVal));
  return {
    title: 'Best to Current Rank Derank Rate',
    x,
    xAxisLabel: 'Deranks per year',
    y,
  };
};
export const rankPlot: ScorePlotData[] = [
  plotDerankRateData(),
  plotBestToCurrentRankDifferenceRateData(),
];
