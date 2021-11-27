import moment from 'moment';
import { EconItem } from 'steamcommunity-inventory';
import { PlayerData } from '../gather';
import { Analysis } from './common';

export interface CSGOBadgesAnalysis extends Analysis {
  csgoBadges?: number;
  oldestCSGOBadgeAgo?: string;
  oldestCSGOBadgeDate?: string;
}

export interface EconItemWithDate extends EconItem {
  date?: moment.Moment;
}

const PRIVATE_PROFILE_SCORE = -2;
// Numbner of badges
const NUMBER_BADGES_MULTIPLIER = 4;
const NUMBER_BADGES_OFFSET = -12; // 3 badges is 0

// Badge age
const BADGE_AGE_SCORE_RANGE = 50;
const BADGE_AGE_SCORE_OFFSET = -1 * (BADGE_AGE_SCORE_RANGE / 10); // Recent 10% of time gets negative
const OLDEST_COLLECTIBLE_DATE = moment('2013-04-26'); // Operation payback start date. Is this the first?

export const analyzeCSGOBadges = (player: PlayerData): CSGOBadgesAnalysis => {
  const collectibles = player.inventory?.collectibles;
  let csgoBadges: number | undefined;
  let oldestCSGOBadgeAgo: string | undefined;
  let oldestCSGOBadgeDate: string | undefined;
  let score: number;
  if (collectibles?.length) {
    csgoBadges = collectibles.length;
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
    const oldestBadge: EconItemWithDate = collectiblesWithDate.reduce((acc, curr) => {
      if (!curr.date) return acc;
      if (!acc.date) return curr;
      if (curr.date.isBefore(acc.date)) return curr;
      return acc;
    });
    let badgeAgeScore = 0;
    if (oldestBadge?.date) {
      oldestCSGOBadgeAgo = oldestBadge.date.fromNow();
      oldestCSGOBadgeDate = oldestBadge.date.format(moment.HTML5_FMT.DATE);
      const daysSinceOldestBadge = oldestBadge.date.diff(moment.now(), 'days');
      const daysBadgesExisted = OLDEST_COLLECTIBLE_DATE.diff(moment.now(), 'days');
      badgeAgeScore =
        (daysSinceOldestBadge / daysBadgesExisted) * BADGE_AGE_SCORE_RANGE + BADGE_AGE_SCORE_OFFSET;
    }
    const numberBadgesScore = csgoBadges * NUMBER_BADGES_MULTIPLIER + NUMBER_BADGES_OFFSET;
    score = badgeAgeScore + numberBadgesScore;
  } else {
    score = PRIVATE_PROFILE_SCORE;
  }
  return {
    csgoBadges,
    oldestCSGOBadgeAgo,
    oldestCSGOBadgeDate,
    score,
  };
};
