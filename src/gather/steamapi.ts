import SteamAPI from 'steamapi';
import { getCache } from '../common/util';

export class SteamApiCache extends SteamAPI {
  private cache = getCache({
    namespace: `steamapi`,
    ttl: 60 * 60 * 24, // 1 day
  });

  public async resolve(value: string): Promise<string> {
    const cacheKey = `resolve-${value}`;
    const data = await this.cache.get(cacheKey);
    if (data) return data;
    const resp = await super.resolve(value);
    await this.cache.set(cacheKey, resp);
    return resp;
  }

  public async getUserLevel(id: string): Promise<number> {
    const cacheKey = `user-level-${id}`;
    const data = await this.cache.get(cacheKey);
    if (data) return data;
    const resp = await super.getUserLevel(id);
    await this.cache.set(cacheKey, resp);
    return resp;
  }

  public async getUserOwnedGamesOptional(id: string): Promise<SteamAPI.Game[] | undefined> {
    const cacheKey = `user-owned-games-${id}`;
    const data = await this.cache.get(cacheKey);
    if (data === '') return undefined;
    if (data) return data;
    let games: SteamAPI.Game[] | undefined;
    try {
      games = await super.getUserOwnedGames(id);
    } catch (err) {
      if (err.message !== 'No games found') {
        throw err;
      }
      games = undefined;
    }
    const cacheString = games || ''; // Cache undefined as empty string to prevent future API errors
    await this.cache.set(cacheKey, cacheString);
    return games;
  }

  public async getUserBadges(id: string): Promise<SteamAPI.PlayerBadges> {
    const cacheKey = `user-badges-${id}`;
    const data = await this.cache.get(cacheKey);
    if (data) return data;
    const resp = await super.getUserBadges(id);
    await this.cache.set(cacheKey, resp);
    return resp;
  }

  public async getUserRecentGames(id: string): Promise<SteamAPI.Game[]> {
    const cacheKey = `user-recent-games-${id}`;
    const data = await this.cache.get(cacheKey);
    if (data) return data;
    const resp = await super.getUserRecentGames(id);
    await this.cache.set(cacheKey, resp);
    return resp;
  }

  public async getUserFriends(id: string): Promise<SteamAPI.Friend[]> {
    const cacheKey = `user-friends-${id}`;
    const data = await this.cache.get(cacheKey);
    if (data) return data;
    const resp = await super.getUserFriends(id);
    await this.cache.set(cacheKey, resp);
    return resp;
  }

  public async getUserSummaryOrdered(
    ids: string[]
  ): Promise<(SteamAPI.PlayerSummary | undefined)[]> {
    const cachePrefix = 'user-summary-';
    const uncachedIds: string[] = [];
    const cachedResults: (SteamAPI.PlayerSummary | undefined)[] = await Promise.all(
      ids.map(async (id) => {
        const cacheKey = `${cachePrefix}${id}`;
        const data = await this.cache.get(cacheKey);
        if (data) return data;
        uncachedIds.push(id);
        return undefined;
      })
    );

    if (!uncachedIds.length) {
      return cachedResults;
    }
    const resp = await super.getUserSummary(uncachedIds);
    // Cache the new results
    await Promise.all(
      resp.map(async (summary) => {
        const cacheKey = `${cachePrefix}${summary.steamID}`;
        await this.cache.set(cacheKey, summary);
      })
    );
    // Recombine new and cached results
    const populatedResults = ids.map((id, index) => {
      const cachedResult = cachedResults[index];
      if (cachedResult) return cachedResult;
      return resp.find((summary) => summary.steamID === id);
    });
    return populatedResults;
  }

  public async getUserBansOrdered(ids: string[]): Promise<(SteamAPI.PlayerBans | undefined)[]> {
    const cachePrefix = 'user-bans-';
    const uncachedIds: string[] = [];
    const cachedResults: (SteamAPI.PlayerBans | undefined)[] = await Promise.all(
      ids.map(async (id) => {
        const cacheKey = `${cachePrefix}${id}`;
        const data = await this.cache.get(cacheKey);
        if (data) return data;
        uncachedIds.push(id);
        return undefined;
      })
    );

    if (!uncachedIds.length) {
      return cachedResults;
    }
    const resp = await super.getUserBans(uncachedIds);
    // Cache the new results
    await Promise.all(
      resp.map(async (bans) => {
        const cacheKey = `${cachePrefix}${bans.steamID}`;
        await this.cache.set(cacheKey, bans);
      })
    );
    // Recombine new and cached results
    const populatedResults = ids.map((id, index) => {
      const cachedResult = cachedResults[index];
      if (cachedResult) return cachedResult;
      return resp.find((bans) => bans.steamID === id);
    });
    return populatedResults;
  }
}
