import Cache from 'hybrid-disk-cache';
import axios from 'axios';

export interface Game {
  region: string;
  game_player_id: string;
  skill_level: number;
  faceit_elo: number;
  game_player_name: string;
  skill_level_label: string;
  regions: Record<string, string>;
  game_profile_id: string;
}

export type Games = Record<string, Game>;

export interface Platforms {
  steam: string;
}

export interface Settings {
  language: string;
}

export interface FaceitPlayerDetails {
  player_id: string;
  nickname: string;
  avatar: string;
  country: string;
  cover_image: string;
  platforms: Platforms;
  games: Games;
  settings: Settings;
  friends_ids: string[];
  new_steam_id: string;
  steam_id_64: string;
  steam_nickname: string;
  memberships: string[];
  faceit_url: string;
  membership_type: string;
  cover_featured_image: string;
  infractions: Record<string, string>;
}

export interface BanPayload {
  nickname: string;
  type: string;
  reason: string;
  game: null;
  starts_at: string;
  ends_at: null;
  user_id: string;
}

export interface FaceitBanResponse {
  code: string;
  env: string;
  message: string;
  payload: BanPayload[];
  time: number;
  version: string;
}

export type FaceitPlayer = Pick<
  FaceitPlayerDetails,
  'player_id' | 'nickname' | 'country' | 'faceit_url'
>;

export interface FaceitData {
  player: FaceitPlayer;
  bans: BanPayload[];
  csgoData?: Game;
}

export class FaceitCache {
  private cache = new Cache({
    path: '/tmp/csgo-sus-cache/faceit',
    ttl: 60 * 60 * 24 * 7, // 1 week
  });

  public async getFaceitData(steamId64: string): Promise<FaceitData | undefined> {
    const cacheKey = `faceit-${steamId64}`;
    const data = await this.cache.get(cacheKey);
    if (data) {
      const dataString = data.toString();
      if (dataString) {
        return JSON.parse(data.toString());
      }
      return undefined; // Return cached empty value
    }
    let faceitData: FaceitData | undefined;
    try {
      const detailsResp = await axios.get<FaceitPlayerDetails>(
        'https://open.faceit.com/data/v4/players',
        {
          params: {
            game_player_id: steamId64,
            game: 'csgo',
          },
          headers: {
            Authorization: `Bearer ${process.env.FACEIT_API_KEY}`,
          },
        }
      );
      const player: FaceitPlayer = {
        player_id: detailsResp.data.player_id,
        nickname: detailsResp.data.nickname,
        country: detailsResp.data.country,
        faceit_url: detailsResp.data.faceit_url,
      };
      const csgoData: Game | undefined = detailsResp.data.games.csgo;
      const banResp = await axios.get<FaceitBanResponse>(
        `https://api.faceit.com/sheriff/v1/bans/${player.player_id}`
      );
      const bans: BanPayload[] = banResp.data.payload;
      faceitData = {
        player,
        bans,
        csgoData,
      };
    } catch (err) {
      if (err.response.status !== 404) {
        throw err;
      }
      faceitData = undefined;
    }
    const cacheString = faceitData ? JSON.stringify(faceitData) : ''; // Cache undefined as empty string to prevent future API errors
    await this.cache.set(cacheKey, Buffer.from(cacheString));
    return faceitData;
  }
}
