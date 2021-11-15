import {
  CSGOStatsGGScraper,
  PlayedWith,
  PlayedWithFilterParams,
  PlayerFilterParams,
  PlayerOutput,
} from 'csgostatsgg-scraper';
import Cache from 'hybrid-disk-cache';

export class CachedCSGOStatsGGScraper extends CSGOStatsGGScraper {
  private cache = new Cache({
    path: '/tmp/csgo-sus-cache/csgostatsgg-scraper',
    ttl: 60 * 60 * 24 * 7, // 1 week
  });

  public async getPlayedWith(
    steamId64: string,
    filterParams?: PlayedWithFilterParams
  ): Promise<PlayedWith> {
    const cacheKey = `played-with-${steamId64}`;
    const data = await this.cache.get(cacheKey);
    if (data) {
      return JSON.parse(data.toString());
    }
    const resp = await super.getPlayedWith(steamId64, filterParams);
    await this.cache.set(cacheKey, Buffer.from(JSON.stringify(resp)));
    return resp;
  }

  public async getPlayer(
    anySteamId: string | bigint,
    filterParams?: PlayerFilterParams
  ): Promise<PlayerOutput> {
    const cacheKey = `player-${anySteamId}`;
    const data = await this.cache.get(cacheKey);
    if (data) {
      return JSON.parse(data.toString());
    }
    const resp = await super.getPlayer(anySteamId, filterParams);
    await this.cache.set(cacheKey, Buffer.from(JSON.stringify(resp)));
    return resp;
  }
}
