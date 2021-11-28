import Cache from 'hybrid-disk-cache';
import axios from 'axios';
import { getCacheDir } from '../common/util';

export interface BanList {
  id: number;
  name: string;
  organisation?: BanList;
  __typename: string;
  discord?: string;
}

export interface Node {
  id: string;
  banList: BanList;
  reason: string;
  created: Date;
  expires: Date | null;
  __typename: string;
}

export interface Edge {
  cursor: string;
  node: Node;
  __typename: string;
}

export interface Bans {
  edges: Edge[];
  __typename: string;
}

export interface SteamUser {
  id: string;
  name: string;
  avatarFull: string;
  reputationPoints: number;
  riskRating: number;
  reputationRank: number;
  lastRefreshedInfo: Date;
  lastRefreshedReputationPoints: Date;
  lastRefreshedReputationRank: Date;
  activeBans: Bans;
  expiredBans: Bans;
  __typename: string;
}

export interface Data {
  steamUser?: SteamUser;
}

export interface SquadBanResponse {
  data: Data;
}

export class SquadCommunityBansCache {
  private cache = new Cache({
    path: `${getCacheDir()}/csgo-sus-cache/squad-community`,
    ttl: 60 * 60 * 24 * 7, // 1 week
  });

  public async getReputation(steamId64: string): Promise<SquadBanResponse> {
    const cacheKey = `reputation-${steamId64}`;
    const data = await this.cache.get(cacheKey);
    if (data) {
      return JSON.parse(data.toString());
    }

    const request = {
      operationName: 'Search',
      variables: { id: steamId64 },
      query: `query Search($id: String!) {
            steamUser(id: $id) {
              id
              name
              avatarFull
              reputationPoints
              riskRating
              reputationRank
              lastRefreshedInfo
              lastRefreshedReputationPoints
              lastRefreshedReputationRank
              activeBans: bans(orderBy: "created", orderDirection: DESC, expired: false) {
                edges {
                  cursor
                  node {
                    id
                    banList {
                      id
                      name
                      organisation {
                        id
                        name
                        discord
                        __typename
                    }
                    __typename
                }
                  reason
                  created
                  expires
                  __typename
              }
                __typename
            }
              __typename
          }
            expiredBans: bans(orderBy: "created", orderDirection: DESC, expired: true) {
                edges {
                  cursor
                  node {
                    id
                    banList {
                      id
                      name
                      organisation {
                        id
                        name
                        discord
                        __typename
                    }
                    __typename
                }
                  reason
                  created
                  expires
                  __typename
              }
                __typename
            }
              __typename
          }
            __typename
        }
      }
        `,
    };

    const resp = await axios.post<SquadBanResponse>(
      `https://squad-community-ban-list.com/graphql`,
      request
    );
    await this.cache.set(cacheKey, Buffer.from(JSON.stringify(resp.data)));
    return resp.data;
  }
}
