import Cache from 'hybrid-disk-cache';
import axios from 'axios';

export interface Reputation {
  full: string;
  summary: string; // "none" for normal users
}

export interface Flags {
  status: string;
}

export interface Steamrep {
  flags: Flags;
  steamID32: string;
  steamID64: string;
  steamrepurl: string;
  reputation: Reputation;
}

export interface ReputationResponse {
  steamrep: Steamrep;
}

export type ReputationSummary = 'none' | string;

// Example scammer: https://steamrep.com/api/beta4/reputation/76561198260351049?json=1
// Example normal: https://steamrep.com/api/beta4/reputation/76561197964105706?json=1

export class SteamRepCache {
  private cache = new Cache({
    path: '/tmp/csgo-sus-cache/steamrep',
    ttl: 60 * 60 * 24 * 7 * 4, // 4 weeks
  });

  public async getReputation(steamId64: string): Promise<ReputationSummary> {
    const cacheKey = `reputation-${steamId64}`;
    const data = await this.cache.get(cacheKey);
    if (data) {
      return data.toString();
    }
    const resp = await axios.get<ReputationResponse>(
      `https://steamrep.com/api/beta4/reputation/${steamId64}?json=1`
    );
    const reputationSummary = resp.data.steamrep.reputation.summary;
    await this.cache.set(cacheKey, Buffer.from(reputationSummary));
    return reputationSummary;
  }
}
