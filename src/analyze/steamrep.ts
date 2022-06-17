import { PlayerData } from '../gather';
import { Analysis } from './common';

export interface SteamRepAnalysis extends Analysis {
  steamRep?: string;
}

const BAD_REP_SCORE = -100;
const NO_DATA_SCORE = 0;

export const analyzeSteamRep = (player: PlayerData): SteamRepAnalysis => {
  const { steamReputation } = player;
  let score: number;
  let link: string | undefined;
  let steamRep: string | undefined;
  if (steamReputation && steamReputation !== 'none') {
    score = BAD_REP_SCORE;
    link = `https://steamrep.com/search?q=${player.steamId.getSteamID64()}`;
    steamRep = steamReputation;
  } else {
    score = NO_DATA_SCORE;
  }
  return {
    score,
    link,
    steamRep,
  };
};
