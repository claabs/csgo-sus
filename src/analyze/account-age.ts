import moment from 'moment';
import { ScorePlotData } from '../common/types';
import { range } from '../common/util';
import { PlayerData } from '../gather';
import { Analysis } from './common';

export interface AccountAgeAnalysis extends Analysis {
  accountCreatedAgo: string;
  accountCreatedDate: string;
}

const SCORE_RANGE = 100;
const OFFSET = -10; // Recent 10% of time gets negative
const STEAM_CREATE_DATE = moment('2003-09-12');

const scoreFunction = (ratioOfSteamExistence: number): number => {
  return ratioOfSteamExistence * SCORE_RANGE + OFFSET;
};

export const analyzeAccountAge = (player: PlayerData): AccountAgeAnalysis => {
  const momentCreated = moment(player.createdAt);
  const daysAccountExisted = moment().diff(momentCreated, 'days');
  const daysSteamExisted = moment().diff(STEAM_CREATE_DATE, 'days');
  const accountCreatedAgo = momentCreated.fromNow();
  const accountCreatedDate = momentCreated.format(moment.HTML5_FMT.DATE);
  const score = scoreFunction(daysAccountExisted / daysSteamExisted);
  return {
    accountCreatedAgo,
    accountCreatedDate,
    score,
  };
};

const plotData = (): ScorePlotData => {
  const daysSteamExisted = moment().diff(STEAM_CREATE_DATE, 'days');
  const x = range(0, daysSteamExisted);
  const y = x.map((xVal) => scoreFunction(xVal / daysSteamExisted));
  return {
    title: 'Account Age',
    x,
    xAxisLabel: 'Account Age (days)',
    y,
  };
};
export const accountAgePlot: ScorePlotData[] = [plotData()];
