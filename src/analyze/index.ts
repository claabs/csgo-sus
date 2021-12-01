import SteamID from 'steamid';
import { PlayerData } from '../gather';
import { analyzeAccountAge, AccountAgeAnalysis } from './account-age';
import { analyzeSteamLevel, SteamLevelAnalysis } from './steam-level';
import { analyzeInventoryValue, InventoryValueAnalysis } from './inventory-value';
import { analyzeOwnedGames, OwnedGamesAnalysis } from './owned-games';
import { analyzeCSGOCollectibles, CSGOCollectiblesAnalysis } from './csgo-collectibles';
import { analyzeRank, RankAnalysis } from './rank';

/**
 * Account age
 * Steam level
 * Inventory value
 * Number of owned games
 * CSGO badges
 * Derank
 * Hours in CS
 * Number of competitive matches won
 * Player bans
 * Friend bans
 * Smurf finder
 * Recent performance consistency
 * Steamrep
 * Squad community bans
 * Faceit
 */

export interface AnalysisSummary {
  accountAge: AccountAgeAnalysis;
  steamLevel: SteamLevelAnalysis;
  inventoryValue: InventoryValueAnalysis;
  ownedGames: OwnedGamesAnalysis;
  csgoCollectibles: CSGOCollectiblesAnalysis;
  rank: RankAnalysis;
}

export type AnalysesEntry = [keyof AnalysisSummary, AnalysisSummary[keyof AnalysisSummary]];

export interface PlayerAnalysis {
  nickname?: string;
  profileLink?: string;
  profileImage?: string;
  steamId: SteamID;
  analyses: AnalysisSummary;
  positiveAnalyses?: AnalysesEntry[];
  negativeAnalyses?: AnalysesEntry[];
  totalScore: number;
}

export const analyzePlayers = (players: PlayerData[]): PlayerAnalysis[] => {
  const analyzedPlayers: PlayerAnalysis[] = players.map((player) => {
    const analyses: AnalysisSummary = {
      accountAge: analyzeAccountAge(player),
      steamLevel: analyzeSteamLevel(player),
      inventoryValue: analyzeInventoryValue(player),
      ownedGames: analyzeOwnedGames(player),
      csgoCollectibles: analyzeCSGOCollectibles(player),
      rank: analyzeRank(player),
    };
    const totalScore = Object.values(analyses).reduce((acc, curr) => acc + curr.score, 0);
    const positiveAnalyses = Object.entries(analyses)
      .filter(([, val]) => val.score >= 0)
      .sort(([, val1], [, val2]) => val1.score - val2.score) as AnalysesEntry[];
    const negativeAnalyses = Object.entries(analyses)
      .filter(([, val]) => val.score < 0)
      .sort(([, val1], [, val2]) => val2.score - val1.score) as AnalysesEntry[];
    return {
      nickname: player.summary?.nickname,
      profileLink: player.summary?.url,
      profileImage: player.summary?.avatar.small,
      steamId: player.steamId,
      analyses,
      positiveAnalyses,
      negativeAnalyses,
      totalScore,
    };
  });
  return analyzedPlayers;
};
