import axios from 'axios';
import { getCache } from '../common/util';

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
  private namespace = `squad-community`;

  private ttl = 1000 * 60 * 60 * 24 * 7; // 1 week

  private cache = getCache();

  public async getReputation(steamId64: string): Promise<SquadBanResponse> {
    const cacheKey = `${this.namespace}:reputation-${steamId64}`;
    const data = await this.cache.get(cacheKey);
    if (data) return data;

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
    await this.cache.set(cacheKey, resp.data, this.ttl);
    return resp.data;
  }
}
