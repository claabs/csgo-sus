import SteamAPI from 'steamapi';
import Cache from 'hybrid-disk-cache';

export class SteamApiCache extends SteamAPI {
  private cache = new Cache({
    path: '/tmp/csgo-sus-cache/steamapi',
    ttl: 60 * 60 * 24, // 1 day
  });

  public async getUserLevel(id: string): Promise<number> {
    const cacheKey = `user-level-${id}`;
    const data = await this.cache.get(cacheKey);
    if (data) {
      return data.readUInt16BE();
    }
    const resp = await super.getUserLevel(id);
    const buf = Buffer.alloc(2);
    buf.writeUInt16BE(resp);
    await this.cache.set(cacheKey, buf);
    return resp;
  }

  public async getUserOwnedGames(id: string): Promise<SteamAPI.Game[]> {
    const cacheKey = `user-owned-games-${id}`;
    const data = await this.cache.get(cacheKey);
    if (data) {
      return JSON.parse(data.toString());
    }
    const resp = await super.getUserOwnedGames(id);
    await this.cache.set(cacheKey, Buffer.from(JSON.stringify(resp)));
    return resp;
  }

  public async getUserBadges(id: string): Promise<SteamAPI.PlayerBadges> {
    const cacheKey = `user-badges-${id}`;
    const data = await this.cache.get(cacheKey);
    if (data) {
      return JSON.parse(data.toString());
    }
    const resp = await super.getUserBadges(id);
    await this.cache.set(cacheKey, Buffer.from(JSON.stringify(resp)));
    return resp;
  }

  public async getUserRecentGames(id: string): Promise<SteamAPI.Game[]> {
    const cacheKey = `user-recent-games-${id}`;
    const data = await this.cache.get(cacheKey);
    if (data) {
      return JSON.parse(data.toString());
    }
    const resp = await super.getUserRecentGames(id);
    await this.cache.set(cacheKey, Buffer.from(JSON.stringify(resp)));
    return resp;
  }

  public async getUserFriends(id: string): Promise<SteamAPI.Friend[]> {
    const cacheKey = `user-friends-${id}`;
    const data = await this.cache.get(cacheKey);
    if (data) {
      return JSON.parse(data.toString());
    }
    const resp = await super.getUserFriends(id);
    await this.cache.set(cacheKey, Buffer.from(JSON.stringify(resp)));
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
        if (data) {
          return JSON.parse(data.toString());
        }
        uncachedIds.push(id);
        return undefined;
      })
    );

    if (!uncachedIds.length) {
      return cachedResults;
    }
    const resp = await super.getUserSummary(uncachedIds);

    await Promise.all(
      resp.map(async (summary) => {
        const cacheKey = `${cachePrefix}${summary.steamID}`;
        await this.cache.set(cacheKey, Buffer.from(JSON.stringify(summary)));
      })
    );
    const populatedResults = ids.map((id, index) => {
      const cachedResult = cachedResults[index];
      if (cachedResults) return cachedResult as SteamAPI.PlayerSummary;
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
        if (data) {
          return JSON.parse(data.toString());
        }
        uncachedIds.push(id);
        return undefined;
      })
    );

    if (!uncachedIds.length) {
      return cachedResults;
    }
    const resp = await super.getUserBans(uncachedIds);
    await Promise.all(
      resp.map(async (bans) => {
        const cacheKey = `${cachePrefix}${bans.steamID}`;
        await this.cache.set(cacheKey, Buffer.from(JSON.stringify(bans)));
      })
    );
    const populatedResults = ids.map((id, index) => {
      const cachedResult = cachedResults[index];
      if (cachedResults) return cachedResult as SteamAPI.PlayerBans;
      return resp.find((bans) => bans.steamID === id);
    });
    return populatedResults;
  }
}
