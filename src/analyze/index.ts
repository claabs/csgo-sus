import { PlayerData } from '../gather';
import { analyzeAccountAge, AccountAgeAnalysis } from './account-age';
import { analyzeSteamLevel, SteamLevelAnalysis } from './steam-level';
import { analyzeInventoryValue, InventoryValueAnalysis } from './inventory-value';
import { analyzeOwnedGames, OwnedGamesAnalysis } from './owned-games';
import { analyzeCSGOCollectibles, CSGOCollectiblesAnalysis } from './csgo-collectibles';

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

export interface AnalysisSummary {
  accountAge: AccountAgeAnalysis;
  steamLevel: SteamLevelAnalysis;
  inventoryValue: InventoryValueAnalysis;
  ownedGames: OwnedGamesAnalysis;
  csgoCollectibles: CSGOCollectiblesAnalysis;
}

export interface PlayerAnalysis {
  nickname?: string;
  analyses: AnalysisSummary;
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
    };
    const analysesValues = Object.values(analyses);
    const totalScore = analysesValues.reduce((acc, curr) => acc + curr.score, 0);
    return {
      nickname: player.summary?.nickname,
      analyses,
      totalScore,
    };
  });
  return analyzedPlayers;
};
