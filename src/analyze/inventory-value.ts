import { PlayerData } from '../gather';
import { Analysis } from './common';

export interface InventoryValueAnalysis extends Analysis {
  fixedInventoryValue?: string;
  marketableItemsCount?: number;
}

const VALUE_SCORE_MULTIPLIER = 0.15; // 150 points for $1000+
const MAXIMUM_VALUE = 1000;
const OFFSET = -4.5; // $30 account gets 0
const PRIVATE_PROFILE_SCORE = -2;

export const analyzeInventoryValue = (player: PlayerData): InventoryValueAnalysis => {
  const items = player.inventory?.marketableItems;
  let fixedInventoryValue: string | undefined;
  let marketableItemsCount: number | undefined;
  let score: number;
  if (items?.length) {
    const valueDollars = items.reduce((accum, item) => {
      const itemPrice = item.price || 0;
      return accum + itemPrice;
    }, 0);
    marketableItemsCount = items.length;
    const cappedValueDollars = valueDollars >= MAXIMUM_VALUE ? MAXIMUM_VALUE : valueDollars; // Cap at maximum value
    score = cappedValueDollars * VALUE_SCORE_MULTIPLIER + OFFSET;
    fixedInventoryValue = `$${valueDollars.toFixed(2)}`;
  } else {
    score = PRIVATE_PROFILE_SCORE;
  }
  return {
    fixedInventoryValue,
    marketableItemsCount,
    score,
  };
};
