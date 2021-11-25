import { PlayerData } from '../gather';

export interface InventoryValueAnalysis {
  valueDollars?: number;
  count?: number;
  score: number;
}

const VALUE_SCORE_MULTIPLIER = 0.15; // 150 points for $1000+
const MAXIMUM_VALUE = 1000;
const OFFSET = -4.5; // $30 account gets 0
const PRIVATE_PROFILE_SCORE = -2;

export const analyzeInventoryValue = (player: PlayerData): InventoryValueAnalysis => {
  const items = player.inventory?.marketableItems;
  let valueDollars: number | undefined;
  let count: number | undefined;
  let score: number;
  if (items && items.length) {
    valueDollars = items.reduce((accum, item) => {
      const itemPrice = item.price || 0;
      return accum + itemPrice;
    }, 0);
    count = items.length;
    valueDollars = valueDollars >= MAXIMUM_VALUE ? MAXIMUM_VALUE : valueDollars; // Cap at maximum value
    score = valueDollars * VALUE_SCORE_MULTIPLIER + OFFSET;
  } else {
    score = PRIVATE_PROFILE_SCORE;
  }
  return {
    valueDollars,
    count,
    score,
  };
};
