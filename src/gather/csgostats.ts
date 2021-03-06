import {
  CSGOStatsGGScraper,
  PlayedWith,
  PlayedWithFilterParams,
  PlayerFilterParams,
  PlayerOutput,
} from 'csgostatsgg-scraper';
import { getCache } from '../common/util';

export class CSGOStatsGGScraperCache extends CSGOStatsGGScraper {
  private namespace = `csgostatsgg-scraper`;

  private ttl = 1000 * 60 * 60 * 24 * 7; // 1 week

  private cache = getCache();

  public async getPlayedWith(
    steamId64: string,
    filterParams?: PlayedWithFilterParams
  ): Promise<PlayedWith> {
    const cacheKey = `${this.namespace}:played-with-${steamId64}`;
    const data = await this.cache.get(cacheKey);
    if (data) {
      return data;
    }
    const resp = await super.getPlayedWith(steamId64, filterParams);
    await this.cache.set(cacheKey, resp, this.ttl);
    return resp;
  }

  public async getPlayer(
    anySteamId: string | bigint,
    filterParams?: PlayerFilterParams
  ): Promise<PlayerOutput> {
    const cacheKey = `${this.namespace}:player-${anySteamId}`;
    const data = await this.cache.get(cacheKey);
    if (data) {
      return data;
    }
    const resp = await super.getPlayer(anySteamId, filterParams);
    await this.cache.set(cacheKey, resp, this.ttl);
    return resp;
  }
}
