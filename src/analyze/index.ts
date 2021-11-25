import { analyzeAccountAge, AccountAgeAnalysis } from './account-age';
import { analyzeSteamLevel, SteamLevelAnalysis } from './steam-level';
import { analyzeInventoryValue, InventoryValueAnalysis } from './inventory-value';
import { PlayerData } from '../gather';

/**
 * Account age
 * Steam level
 * Number of owned games
 * Inventory value
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

export type PlayerAnalysis = AccountAgeAnalysis &
  SteamLevelAnalysis &
  InventoryValueAnalysis & { nickname?: string; fixedScore: string };

export const analyzePlayers = (players: PlayerData[]): PlayerAnalysis[] => {
  const analyzedPlayers: PlayerAnalysis[] = players.map((player) => {
    const age = analyzeAccountAge(player);
    const level = analyzeSteamLevel(player);
    const inventory = analyzeInventoryValue(player);
    const score = age.score + level.score + inventory.score;
    const fixedScore = score.toFixed(1);
    return {
      nickname: player.summary?.nickname,
      ...age,
      ...level,
      ...inventory,
      score,
      fixedScore,
    };
  });
  return analyzedPlayers;
};
