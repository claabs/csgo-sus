import { analyzeAccountAge, AccountAgeAnalysis } from './account-age';
import { analyzeSteamLevel, SteamLevelAnalysis } from './steam-level';
import { analyzeInventoryValue, InventoryValueAnalysis } from './inventory-value';
import { PlayerData } from '../gather';
import { Analysis } from './common';

/**
 * Account age
 * Steam level
 * Inventory value
 * Number of owned games
 * CSGO badges
 * Player bans
 * Friend bans
 * Smurf finder
 * Derank
 * Recent performance consistency
 * Hours in CS
 * Number of competitive matches won
 * Steamrep
 * Squad community bans
 * Faceit
 */

export type AnalysisDetails = Omit<
  AccountAgeAnalysis & SteamLevelAnalysis & InventoryValueAnalysis,
  keyof Analysis
>;
export type PlayerAnalysis = AnalysisDetails & { nickname?: string; totalScore: number };

export const analyzePlayers = (players: PlayerData[]): PlayerAnalysis[] => {
  const analyzedPlayers: PlayerAnalysis[] = players.map((player) => {
    const analyses = [
      analyzeAccountAge(player),
      analyzeSteamLevel(player),
      analyzeInventoryValue(player),
    ];
    const totalScore = analyses.reduce((acc, curr) => acc + curr.score, 0);
    const analysisDetails = analyses.reduce((acc, curr) => {
      const prunedEntries = Object.entries(curr).filter(([key]) => key !== 'score');
      const prunedDetails = Object.fromEntries(prunedEntries) as AnalysisDetails;
      return {
        ...acc,
        ...prunedDetails,
      };
    }, {}) as AnalysisDetails;

    return {
      nickname: player.summary?.nickname,
      ...analysisDetails,
      totalScore,
    };
  });
  return analyzedPlayers;
};
