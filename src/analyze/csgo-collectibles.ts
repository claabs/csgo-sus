import moment from 'moment';
import { EconItem } from 'steamcommunity-inventory';
import { PlayerData } from '../gather';
import { Analysis } from './common';

export interface CSGOCollectiblesAnalysis extends Analysis {
  csgoCollectiblesCount?: number;
  oldestCSGOCollectibleAgo?: string;
  oldestCSGOCollectibleDate?: string;
}

export interface EconItemWithDate extends EconItem {
  date?: moment.Moment;
}

const PRIVATE_PROFILE_SCORE = -2;
// Numbner of badges
const NUMBER_BADGES_MULTIPLIER = 4;
const NUMBER_BADGES_OFFSET = -12; // 3 badges is 0

// Badge age
const COLLECTIBLE_AGE_SCORE_RANGE = 50;
const COLLECTIBLE_AGE_SCORE_OFFSET = -1 * (COLLECTIBLE_AGE_SCORE_RANGE / 10); // Recent 10% of time gets negative
const OLDEST_COLLECTIBLE_DATE = moment('2013-04-26'); // Operation payback start date. Is this the first?

export const analyzeCSGOCollectibles = (player: PlayerData): CSGOCollectiblesAnalysis => {
  const collectibles = player.inventory?.collectibles;
  let csgoCollectiblesCount: number | undefined;
  let oldestCSGOCollectibleAgo: string | undefined;
  let oldestCSGOCollectibleDate: string | undefined;
  let collectibleCountScore: number | undefined;
  let collectibleAgeScore: number | undefined;
  let score: number;
  if (collectibles?.length) {
    csgoCollectiblesCount = collectibles.length;
    const collectiblesWithDate: EconItemWithDate[] = collectibles.map((collectible) => {
      const ageDesc = collectible.descriptions.find((desc) => desc.value.includes('Date'));
      if (ageDesc) {
        const match = ageDesc.value.match(/(Date of Issue|Deployment Date): (.*)/);
        const dateString = match?.[2];
        if (dateString) {
          const issueDate = moment(dateString, 'MMM DD, YYYY');
          return {
            ...collectible,
            date: issueDate,
          };
        }
      }
      return collectible;
    });
    const oldestCollectible: EconItemWithDate = collectiblesWithDate.reduce((acc, curr) => {
      if (!curr.date) return acc;
      if (!acc.date) return curr;
      if (curr.date.isBefore(acc.date)) return curr;
      return acc;
    });
    collectibleAgeScore = 0;
    if (oldestCollectible?.date) {
      oldestCSGOCollectibleAgo = oldestCollectible.date.fromNow();
      oldestCSGOCollectibleDate = oldestCollectible.date.format(moment.HTML5_FMT.DATE);
      const daysSinceOldestCollectible = oldestCollectible.date.diff(moment.now(), 'days');
      const daysCollectiblesExisted = OLDEST_COLLECTIBLE_DATE.diff(moment.now(), 'days');
      collectibleAgeScore =
        (daysSinceOldestCollectible / daysCollectiblesExisted) * COLLECTIBLE_AGE_SCORE_RANGE +
        COLLECTIBLE_AGE_SCORE_OFFSET;
    }
    collectibleCountScore = csgoCollectiblesCount * NUMBER_BADGES_MULTIPLIER + NUMBER_BADGES_OFFSET;
    score = collectibleAgeScore + collectibleCountScore;
  } else {
    score = PRIVATE_PROFILE_SCORE;
  }
  return {
    csgoCollectiblesCount,
    oldestCSGOCollectibleAgo,
    oldestCSGOCollectibleDate,
    score,
  };
};
