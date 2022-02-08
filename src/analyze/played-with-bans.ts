import { ScorePlotData } from '../common/types';
import { range } from '../common/util';
import { PlayerData } from '../gather';
import { Analysis } from './common';
import L from '../common/logger';

export interface PlayedWithBansAnalysis extends Analysis {
  gamesWithBannedRegularTeammate?: number;
}
const BANNEDS_PLAYED_WITH_MULTIPLIER = -2;

const playedWithBansScoreFunction = (gamesWithBannedRegularTeammate: number): number => {
  return gamesWithBannedRegularTeammate * BANNEDS_PLAYED_WITH_MULTIPLIER;
};

export const analyzePlayedWithBans = (player: PlayerData): PlayedWithBansAnalysis => {
  const { csgoStatsDeepPlayedWith } = player;
  let score = 0;
  let gamesWithBannedRegularTeammate: number | undefined;
  const link = `https://csgostats.gg/player/${player.steamId.getSteamID64()}?type=comp#/players`;

  const bannedPlayedWith = csgoStatsDeepPlayedWith?.root.filter(
    (pw) => (pw.details.is_banned || pw.details.vac_banned) && pw.stats.games > 5
  );
  if (bannedPlayedWith?.length) {
    L.debug({ bannedPlayedWith });
    gamesWithBannedRegularTeammate = bannedPlayedWith.reduce(
      (acc, curr) => acc + curr.stats.games,
      0
    );
    score = playedWithBansScoreFunction(gamesWithBannedRegularTeammate);
  }
  score = Math.min(0, score); // Don't get positive points
  return {
    gamesWithBannedRegularTeammate,
    score,
    link,
  };
};

const plotBannedFriendsPlayedWithRateData = (): ScorePlotData => {
  const x = range(0, 100);
  const y = x.map((xVal) => playedWithBansScoreFunction(xVal));
  return {
    title: 'Number of people played with a significant amount that got banned',
    x,
    xAxisLabel: 'Number of players',
    y,
  };
};
export const playedWithBansPlot: ScorePlotData[] = [plotBannedFriendsPlayedWithRateData()];
