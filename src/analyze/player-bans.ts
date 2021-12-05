import { PlayerData } from '../gather';
import { Analysis } from './common';

export interface PlayerBansAnalysis extends Analysis {
  communityBanned?: boolean;
  economyBan?: boolean;
  vacBans?: number;
  gameBans?: number;
  daysSinceLastBan?: number;
}

const VAC_BAN_MULTIPLIER = -150;
const GAME_BAN_MULTIPLIER = -100;
const BAN_LENGTH_MULTIPLIER = 0.5; // banned yesterday = -548 points
const BAN_LENGTH_OFFSET = 365 * 3; // 3 years incurs no recency penalty

export const analyzePlayerBans = (player: PlayerData): PlayerBansAnalysis => {
  const { playerBans } = player;
  let score = 0;
  const communityBanned = playerBans?.communityBanned || undefined;
  const economyBan = playerBans?.economyBan !== 'none' || undefined;
  const vacBans = playerBans?.vacBans || undefined;
  const gameBans = playerBans?.gameBans || undefined;
  const daysSinceLastBan = playerBans?.daysSinceLastBan || undefined;
  if (playerBans) {
    if (communityBanned) score -= 15;
    if (economyBan) score -= 30;
    if (vacBans) score += VAC_BAN_MULTIPLIER * vacBans;
    if (gameBans) score += GAME_BAN_MULTIPLIER * gameBans;
    if (daysSinceLastBan) score += (daysSinceLastBan - BAN_LENGTH_OFFSET) * BAN_LENGTH_MULTIPLIER;
    score = Math.min(0, score); // Don't get positive points for being banned
  }
  return {
    communityBanned,
    economyBan,
    vacBans,
    gameBans,
    daysSinceLastBan,
    score,
  };
};
