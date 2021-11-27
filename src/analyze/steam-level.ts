import { PlayerData } from '../gather';
import { Analysis } from './common';

export interface SteamLevelAnalysis extends Analysis {
  steamLevel?: number;
  experience?: number;
}

const LEVEL_SCORE_MULTIPLIER = 0.5;
const OFFSET = -2; // Level 4 account gets 0
const PRIVATE_PROFILE_SCORE = -2;

export const analyzeSteamLevel = (player: PlayerData): SteamLevelAnalysis => {
  const { steamLevel } = player;
  const experience = player.badges?.playerXP;
  let score: number;
  if (steamLevel) {
    score = steamLevel * LEVEL_SCORE_MULTIPLIER + OFFSET;
  } else {
    score = PRIVATE_PROFILE_SCORE;
  }
  return {
    steamLevel,
    experience,
    score,
  };
};
