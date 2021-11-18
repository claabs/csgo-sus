/* eslint-disable camelcase */
import { EconItem, Inventory } from 'steamcommunity-inventory';
import Cache from 'hybrid-disk-cache';
import axios from 'axios';

export interface ItemWithValue {
  marketName: string;
  price?: number;
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
    path: '/tmp/csgo-sus-cache/inventory-value',
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
      path: '/tmp/csgo-sus-cache/csgo-prices',
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

  public async getInventoryValue(steamId64: string): Promise<ItemWithValue[] | undefined> {
    const cacheKey = `inventory-${steamId64}`;
    const data = await this.cache.get(cacheKey);
    if (data) {
      return JSON.parse(data.toString());
    }
    try {
      const items: EconItem[] = await this.inventory.get({
        appID: '730', // CSGO
        contextID: '2', // Default
        steamID: steamId64,
      });
      const marketableItems = items.filter((item) => item.marketable > 0);
      const itemWithPrices = await Promise.all(
        marketableItems.map(async (item) => ({
          price: await this.getItemPrice(item.market_hash_name),
          marketName: item.market_hash_name,
        }))
      );
      await this.cache.set(cacheKey, Buffer.from(JSON.stringify(itemWithPrices)));
      return itemWithPrices;
    } catch (err) {
      if (err.response.status === 403) {
        return undefined;
      }
      throw err;
    }
  }
}
