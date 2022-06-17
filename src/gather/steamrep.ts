import axios from 'axios';
import { getCache } from '../common/util';

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

export type ReputationSummary = 'none' | 'SCAMMER' | string;

// Example scammer: https://steamrep.com/api/beta4/reputation/76561198260351049?json=1
// Example normal: https://steamrep.com/api/beta4/reputation/76561197964105706?json=1

export class SteamRepCache {
  private namespace = `steamrep`;

  private ttl = 1000 * 60 * 60 * 24 * 7 * 4; // 4 weeks

  private cache = getCache();

  public async getReputation(steamId64: string): Promise<ReputationSummary> {
    const cacheKey = `${this.namespace}:reputation-${steamId64}`;
    const data = await this.cache.get(cacheKey);
    if (data) return data;
    const resp = await axios.get<ReputationResponse>(
      `https://steamrep.com/api/beta4/reputation/${steamId64}?json=1`
    );
    const reputationSummary = resp.data.steamrep.reputation.summary;
    await this.cache.set(cacheKey, reputationSummary, this.ttl);
    return reputationSummary;
  }
}
