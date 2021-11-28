import { EconItem, Inventory } from 'steamcommunity-inventory';
import Cache from 'hybrid-disk-cache';
import axios from 'axios';
import { getCacheDir } from '../common/util';

export interface ItemWithValue {
  marketName: string;
  price?: number;
}

export interface InventoryWithValue {
  collectibles: EconItem[];
  marketableItems: ItemWithValue[];
}

export interface CSGOTraderPrice {
  steam: {
    last_24h: number;
    last_7d: number;
    last_30d: number;
    last_90d: number;
  };
}
export interface PriceCache {
  [marketHashName: string]: CSGOTraderPrice;
}

export class InventoryValueCache {
  private cache = new Cache({
    path: `${getCacheDir()}/csgo-sus-cache/inventory-value`,
    ttl: 60 * 60 * 24 * 7, // 1 week
  });

  private inventory: Inventory;

  private priceCache: PriceCache | undefined;

  constructor() {
    this.inventory = new Inventory({
      method: 'new',
      maxConcurent: 1,
      minTime: 500,
    });
  }

  private async getItemPrice(marketHashName: string): Promise<number | undefined> {
    const cacheKey = `market-price`;
    const cache = new Cache({
      path: `${getCacheDir()}/csgo-sus-cache/csgo-prices`,
      ttl: 60 * 60 * 24, // 1 day
    });
    if (!this.priceCache) {
      const data = await cache.get(cacheKey);
      if (data) {
        this.priceCache = JSON.parse(data.toString());
      } else {
        // https://csgotrader.app/prices/
        const prices = await axios.get<PriceCache>(
          'https://prices.csgotrader.app/latest/prices_v6.json'
        );
        this.priceCache = prices.data;
        await cache.set(cacheKey, Buffer.from(JSON.stringify(this.priceCache)));
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.priceCache![marketHashName]?.steam.last_24h;
  }

  public async getInventoryWithValue(steamId64: string): Promise<InventoryWithValue | undefined> {
    const cacheKey = `inventory-${steamId64}`;
    const data = await this.cache.get(cacheKey);
    if (data) {
      const dataString = data.toString();
      if (dataString) {
        return JSON.parse(data.toString());
      }
      return undefined; // Return cached empty value
    }
    let inventory: InventoryWithValue | undefined;
    try {
      const items: EconItem[] = await this.inventory.get({
        appID: '730', // CSGO
        contextID: '2', // Default
        steamID: steamId64,
      });
      const marketableItems = items.filter((item) => item.marketable > 0);
      const collectibles = items.filter((item) =>
        item.tags.some((tag) => tag.internal_name === 'CSGO_Type_Collectible')
      );
      const marketableItemsWithPrices: ItemWithValue[] = await Promise.all(
        marketableItems.map(async (item) => ({
          price: await this.getItemPrice(item.market_hash_name),
          marketName: item.market_hash_name,
        }))
      );
      inventory = {
        marketableItems: marketableItemsWithPrices,
        collectibles,
      };
    } catch (err) {
      if (err.response.status !== 403) {
        throw err;
      }
      inventory = undefined;
    }
    const cacheString = inventory ? JSON.stringify(inventory) : ''; // Cache undefined as empty string to prevent future API errors
    await this.cache.set(cacheKey, Buffer.from(cacheString));
    return inventory;
  }
}
