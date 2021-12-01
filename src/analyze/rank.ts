import { MatchmakingRank } from 'csgostatsgg-scraper';
import moment from 'moment';
import { PlayerData } from '../gather';
import { Analysis } from './common';
import L from '../common/logger';

export interface RankAnalysis extends Analysis {
  currentRank?: MatchmakingRank;
  bestRank?: MatchmakingRank;
  derankRate?: string;
  bestToCurrentRankDifferenceScore?: string;
  derankRateScore?: string;
}

const BEST_TO_CURRENT_RANK_DIFF_MULTIPLIER = -10;
const BEST_TO_CURRENT_RANK_DIFF_OFFSET = 30;
const DERANK_RATE_SCORE_MUILTIPLIER = -10;
const DERANK_RATE_SCORE_OFFSET = 15;
const NO_DERANK_SCORE = 0;
const NO_DATA_SCORE = -10;

export const analyzeRank = (player: PlayerData): RankAnalysis => {
  const bestRank = player.csgoStatsPlayer?.summary.bestRank;
  const currentRank = player.csgoStatsPlayer?.summary.currentRank;
  const rawData = player.csgoStatsPlayer?.graphs?.rawData;
  let score: number;
  let derankRate: string | undefined;
  let rankDifferenceScore: string | undefined;
  let derankRateScore: string | undefined;
  if (rawData && bestRank && currentRank) {
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
    if (recentBestRankPoint.rank > currentRank) {
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
        const worstRankDate = moment(recentWorstRankPoint.date, 'YYYY-MM-DD HH:mm:ss'); // 2017-10-27 00:51:10
        const derankDuration = worstRankDate.diff(bestRankDate, 'months', true); // Returns floating point number of months
        const derankRateValue = derankAmount / derankDuration;
        const bestRankToCurrentRankDifference = recentBestRankPoint.rank - currentRank; // 2 is reasonable
        // score = -10 * bestRankToCurrentRankDifference + 30
        // 1 is fine        20
        // 2 is okay        10
        // 3 is concerning  0
        // 4 is bad         -10
        const bestToCurrentRankDifferenceScoreNum =
          bestRankToCurrentRankDifference * BEST_TO_CURRENT_RANK_DIFF_MULTIPLIER +
          BEST_TO_CURRENT_RANK_DIFF_OFFSET;
        // score = -10 * derankRateValue + 15
        // Drop 1 rank in a month: 5
        // Drop 2 ranks in a month: -5
        // Drop 3 ranks in a month: -15
        // Drop 4 ranks in a month: -25
        const derankRateScoreNum =
          derankRateValue * DERANK_RATE_SCORE_MUILTIPLIER + DERANK_RATE_SCORE_OFFSET;

        score = Math.min(bestToCurrentRankDifferenceScoreNum + derankRateScoreNum, 0); // Cap at 0
        L.debug({
          bestRankDate: bestRankDate.toISOString(),
          worstRankDate: worstRankDate.toISOString(),
          derankDuration,
          derankRateValue,
          rankScore: score,
        });
        derankRate = `${derankAmount} ranks ${bestRankDate.to(worstRankDate)}`;
        rankDifferenceScore = bestToCurrentRankDifferenceScoreNum.toFixed(2);
        derankRateScore = derankRateScoreNum.toFixed(2);
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
    derankRate,
    bestToCurrentRankDifferenceScore: rankDifferenceScore,
    derankRateScore,
    score,
  };
};
