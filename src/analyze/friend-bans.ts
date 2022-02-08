import moment from 'moment';
import { ScorePlotData } from '../common/types';
import { range } from '../common/util';
import { PlayerData } from '../gather';
import { Analysis } from './common';
import L from '../common/logger';

export interface FriendBansAnalysis extends Analysis {
  friendsBannedWhenFriends?: number;
  friendsBannedBeforeFriends?: number;
}

const FRIENDS_BANNED_WHEN_FRIENDS_MULTIPLIER = -1;
const FRIENDS_BANNED_BEFORE_FRIENDS_MULTIPLIER = -0.5;

const friendsBannedWhenFriendsScoreFunction = (count: number): number => {
  return count * FRIENDS_BANNED_WHEN_FRIENDS_MULTIPLIER;
};
const friendsBannedBeforeFriendsScoreFunction = (count: number): number => {
  return count * FRIENDS_BANNED_BEFORE_FRIENDS_MULTIPLIER;
};

export const analyzeFriendBans = (player: PlayerData): FriendBansAnalysis => {
  const { friends } = player;
  let score = 0;
  const link = `https://csgostats.gg/player/${player.steamId.getSteamID64()}?type=comp#/players`;
  let friendsBannedWhenFriends;
  let friendsBannedBeforeFriends;
  if (friends) {
    const bannedFriends = friends
      .filter(
        (friend) =>
          friend.communityBanned ||
          friend.economyBan !== 'none' ||
          friend.vacBanned ||
          friend.gameBans > 0
      )
      .map((friend) => {
        const friendedAt = moment(friend.friendSince);
        const lastBanAt = moment().subtract(friend.daysSinceLastBan, 'days');
        let playedWithTimes: number | undefined;

        const playedWithData = player.csgoStatsDeepPlayedWith?.root.find(
          (pw) => pw.steam_id === friend.steamID
        );
        if (playedWithData) {
          playedWithTimes = playedWithData.stats.games;
        }
        const friendsWhenBanned = friendedAt.isBefore(lastBanAt);
        return {
          playedWithTimes,
          friendsWhenBanned,
          profileLink: friend.url,
          id: friend.steamID,
        };
      });

    const friendsBannedWhenFriendsList = bannedFriends.filter((f) => f.friendsWhenBanned);
    friendsBannedWhenFriends = friendsBannedWhenFriendsList.length || undefined;
    if (friendsBannedWhenFriends) L.debug({ friendsBannedWhenFriendsList });

    const friendsBannedBeforeFriendsList = bannedFriends.filter((f) => !f.friendsWhenBanned);
    friendsBannedBeforeFriends = friendsBannedBeforeFriendsList.length || undefined;
    if (friendsBannedBeforeFriends) L.debug({ friendsBannedBeforeFriendsList });
  }

  if (friendsBannedWhenFriends) {
    score += friendsBannedWhenFriendsScoreFunction(friendsBannedWhenFriends);
  }
  if (friendsBannedBeforeFriends) {
    score += friendsBannedBeforeFriendsScoreFunction(friendsBannedBeforeFriends);
  }

  score = Math.min(0, score); // Don't get positive points
  return {
    friendsBannedWhenFriends,
    friendsBannedBeforeFriends,
    score,
    link,
  };
};

const plotFriendsBannedWhenFriendsRateData = (): ScorePlotData => {
  const x = range(0, 100);
  const y = x.map((xVal) => friendsBannedWhenFriendsScoreFunction(xVal));
  return {
    title: 'Number of friends banned during friendship',
    x,
    xAxisLabel: 'Number of friends',
    y,
  };
};
const plotFriendsBannedBeforeFriendsRateData = (): ScorePlotData => {
  const x = range(0, 100);
  const y = x.map((xVal) => friendsBannedBeforeFriendsScoreFunction(xVal));
  return {
    title: 'Number of friends banned before friendship',
    x,
    xAxisLabel: 'Number of friends',
    y,
  };
};
export const friendBansPlot: ScorePlotData[] = [
  plotFriendsBannedWhenFriendsRateData(),
  plotFriendsBannedBeforeFriendsRateData(),
];
