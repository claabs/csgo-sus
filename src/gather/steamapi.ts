import SteamAPI from 'steamapi';
import { chunkArray, getCache } from '../common/util';

export type FriendSummary = SteamAPI.Friend & SteamAPI.PlayerSummary & SteamAPI.PlayerBans;

export class SteamApiCache extends SteamAPI {
  private namespace = `steamapi`;

  private ttl = 1000 * 60 * 60 * 24; // 1 day

  private cache = getCache();

  public async resolve(value: string): Promise<string> {
    const cacheKey = `${this.namespace}:resolve-${value}`;
    const data = await this.cache.get(cacheKey);
    if (data) return data;
    const resp = await super.resolve(value);
    await this.cache.set(cacheKey, resp, this.ttl);
    return resp;
  }

  public async getUserLevel(id: string): Promise<number> {
    const cacheKey = `${this.namespace}:user-level-${id}`;
    const data = await this.cache.get(cacheKey);
    if (data) return data;
    const resp = await super.getUserLevel(id);
    await this.cache.set(cacheKey, resp, this.ttl);
    return resp;
  }

  public async getUserOwnedGamesOptional(id: string): Promise<SteamAPI.Game[] | undefined> {
    const cacheKey = `${this.namespace}:user-owned-games-${id}`;
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
    await this.cache.set(cacheKey, cacheString, this.ttl);
    return games;
  }

  public async getUserBadges(id: string): Promise<SteamAPI.PlayerBadges> {
    const cacheKey = `${this.namespace}:user-badges-${id}`;
    const data = await this.cache.get(cacheKey);
    if (data) return data;
    const resp = await super.getUserBadges(id);
    await this.cache.set(cacheKey, resp, this.ttl);
    return resp;
  }

  public async getUserRecentGames(id: string): Promise<SteamAPI.Game[]> {
    const cacheKey = `${this.namespace}:user-recent-games-${id}`;
    const data = await this.cache.get(cacheKey);
    if (data) return data;
    const resp = await super.getUserRecentGames(id);
    await this.cache.set(cacheKey, resp, this.ttl);
    return resp;
  }

  public async getUserFriends(id: string): Promise<SteamAPI.Friend[]> {
    const cacheKey = `${this.namespace}:user-friends-${id}`;
    const data = await this.cache.get(cacheKey);
    if (data) return data;
    let resp: SteamAPI.Friend[];
    try {
      resp = await super.getUserFriends(id);
    } catch (err) {
      if (err.message !== 'Unauthorized') {
        throw err;
      }
      resp = []; // Cache undefined as empty array to prevent future API errors
    }
    await this.cache.set(cacheKey, resp, this.ttl);
    return resp;
  }

  public async getUserFriendSummaries(id: string): Promise<FriendSummary[]> {
    const friends = await this.getUserFriends(id);
    const friendIds = friends.map((f) => f.steamID);
    const summaries = await this.getUserSummaryOrdered(friendIds);
    const bans = await this.getUserBansOrdered(friendIds);
    const friendSummaries = friends.map(
      (f, index): FriendSummary => ({
        ...f,
        ...summaries[index],
        ...bans[index],
      })
    );
    return friendSummaries;
  }

  public async getUserSummaryLimitless(ids: string[]): Promise<SteamAPI.PlayerSummary[]> {
    const idChunks = chunkArray(ids, 100); // Steam API only accepts up to 100
    const results = await Promise.all(
      idChunks.map((idChunk) =>
        super.getUserSummary(idChunk).catch((err) => {
          if (err.message !== 'No players found') throw err;
        })
      )
    );
    return results.filter((e): e is SteamAPI.PlayerSummary[] => !!e).flat();
  }

  public async getUserSummaryOrdered(ids: string[]): Promise<SteamAPI.PlayerSummary[]> {
    const cachePrefix = `${this.namespace}:user-summary-`;
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
      return cachedResults as SteamAPI.PlayerSummary[];
    }
    const resp = await this.getUserSummaryLimitless(uncachedIds);
    // Cache the new results
    await Promise.all(
      resp.map(async (summary) => {
        const cacheKey = `${cachePrefix}${summary.steamID}`;
        await this.cache.set(cacheKey, summary, this.ttl);
      })
    );
    // Recombine new and cached results
    const populatedResults = ids.map((id, index) => {
      const cachedResult = cachedResults[index];
      if (cachedResult) return cachedResult;
      return resp.find((summary) => summary.steamID === id);
    });
    return populatedResults as SteamAPI.PlayerSummary[];
  }

  public async getUserBansLimitless(ids: string[]): Promise<SteamAPI.PlayerBans[]> {
    const idChunks = chunkArray(ids, 100); // Steam API only accepts up to 100
    const results = await Promise.all(
      idChunks.map((idChunk) =>
        super.getUserBans(idChunk).catch((err) => {
          if (err.message !== 'No players found') throw err;
        })
      )
    );
    return results.filter((e): e is SteamAPI.PlayerBans[] => !!e).flat();
  }

  public async getUserBansOrdered(ids: string[]): Promise<SteamAPI.PlayerBans[]> {
    const cachePrefix = `${this.namespace}:user-bans-`;
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
      return cachedResults as SteamAPI.PlayerBans[];
    }
    const resp = await this.getUserBansLimitless(uncachedIds);
    // Cache the new results
    await Promise.all(
      resp.map(async (bans) => {
        const cacheKey = `${cachePrefix}${bans.steamID}`;
        await this.cache.set(cacheKey, bans, this.ttl);
      })
    );
    // Recombine new and cached results
    const populatedResults = ids.map((id, index) => {
      const cachedResult = cachedResults[index];
      if (cachedResult) return cachedResult;
      return resp.find((bans) => bans.steamID === id);
    });
    return populatedResults as SteamAPI.PlayerBans[];
  }
}
