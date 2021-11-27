import moment from 'moment';
import { PlayerData } from '../gather';
import { Analysis } from './common';

export interface AccountAgeAnalysis extends Analysis {
  accountCreatedAgo: string;
  accountCreatedDate: string;
}

const SCORE_RANGE = 100;
const OFFSET = -10; // Recent 10% of time gets negative
const STEAM_CREATE_DATE = moment('2003-09-12');

export const analyzeAccountAge = (player: PlayerData): AccountAgeAnalysis => {
  const momentCreated = moment(player.createdAt);
  const daysAccountExisted = momentCreated.diff(moment.now(), 'days');
  const daysSteamExisted = STEAM_CREATE_DATE.diff(moment.now(), 'days');
  const accountCreatedAgo = momentCreated.fromNow();
  const accountCreatedDate = momentCreated.format(moment.HTML5_FMT.DATE);
  const score = (daysAccountExisted / daysSteamExisted) * SCORE_RANGE + OFFSET;
  return {
    accountCreatedAgo,
    accountCreatedDate,
    score,
  };
};
