import SteamApi, { PlayerBans, PlayerSummary, RecentGame } from 'steamapi';
import SteamID from 'steamid';
import { CSGOStatsGGScraper, MatchType, Player, PlayerOutput } from 'csgostatsgg-scraper';
import 'dotenv/config';
import { EventEmitter } from 'events';
import { AxiosError } from 'axios';
import L from '../common/logger';
import { FriendSummary, SteamApiCache } from './steamapi';
import { CSGOStatsGGScraperCache } from './csgostats';
import { InventoryValueCache, InventoryWithValue } from './inventory';
import { ReputationSummary, SteamRepCache } from './steamrep';
import { FaceitCache, FaceitData } from './faceit';
import { cleanAxiosResponse } from '../common/util';

EventEmitter.defaultMaxListeners = 100; // This doesn't seem to work..

const steam = new SteamApiCache(process.env.STEAM_API_KEY || '');
const inventory = new InventoryValueCache();
const steamrep = new SteamRepCache();
const faceIt = new FaceitCache();

export const logErrorValue =
  <T>(returnValue: T, logValue?: unknown): ((err: unknown) => T) =>
  (err): T => {
    if (logValue) L.warn(logValue);
    L.error(err);
    if ((err as AxiosError)?.response) {
      L.error({ axiosResponse: cleanAxiosResponse(err as AxiosError) });
    }
    return returnValue;
  };
export const logError = logErrorValue(undefined);

/**
 * Since accountIds are sequential, we just check the neighbors for their creation date, which should be fairly close
 * @param accountId number at the end of SteamID3 ([U:1:XXXXXXXX])
 * @returns creation date
 */
export const getPrivateCreationDate = async (accountId: number, offset = 1): Promise<Date> => {
  const MAX_OFFSET = 10; // How many accounts/2 to check before throwing an error
  const API_BATCH_SIZE = 10; // How many accounts to query at a time (max 100)

  if (offset >= MAX_OFFSET)
    throw new Error(`Could not find public neighbor profile after ${MAX_OFFSET * 2} attempts`);

  // Zigzag the IDs alternating above and below the target
  let newOffset = offset;
  const neighbors = [];
  for (let i = 0; i < API_BATCH_SIZE; i += 1) {
    neighbors.push(accountId + newOffset);
    if (newOffset < 0) {
      newOffset = newOffset * -1 + 1; // When negative, invert to positive and increment
    } else {
      newOffset *= -1; // When positive, invert to negative
    }
  }

  // Map the Steam AccountID back to a SteamID64
  const userList = neighbors.map((id) => SteamID.fromIndividualAccountID(id).getSteamID64());
  // Call the Steam API
  const neighborSummaries: PlayerSummary[] = await steam.getUserSummary(userList);

  // They're ordered from closest to furthest, so pick the first public profile
  const nearestNeighbor = neighborSummaries.find((p) => p.visibilityState === 3 && p.created); // 3 is public
  if (nearestNeighbor) return new Date((nearestNeighbor.created as number) * 1000);
  // Else try again recursively
  return getPrivateCreationDate(accountId, newOffset);
};

export interface DeepPlayedWith {
  root: Player[];
  deep: Player[][];
}

export interface PlayerData {
  steamId: SteamID;
  createdAt: Date;
  summary?: PlayerSummary;
  steamLevel?: number;
  ownedGames?: SteamApi.Game[];
  recentGames?: RecentGame[];
  badges?: SteamApi.PlayerBadges;
  friends?: FriendSummary[];
  playerBans?: PlayerBans;
  csgoStatsPlayer?: PlayerOutput;
  csgoStatsDeepPlayedWith?: DeepPlayedWith;
  inventory?: InventoryWithValue;
  steamReputation?: ReputationSummary;
  faceit?: FaceitData;
}

export const getSignificantPlayedWith = async (steamId: string, scraper: CSGOStatsGGScraper) => {
  const SIGNIFICANT_GAMES = 5;
  const playedWith = await scraper.getPlayedWith(steamId, { mode: MatchType.COMPETITIVE });
  const significantPlayers = playedWith.players.filter((p) => p.stats.games >= SIGNIFICANT_GAMES);
  return significantPlayers;
};

export const getDeepPlayedWith = async (
  steamId: string,
  scraper: CSGOStatsGGScraper
): Promise<DeepPlayedWith> => {
  const rootPlayedWith = await getSignificantPlayedWith(steamId, scraper);
  const deepPlayedWith = await Promise.all(
    rootPlayedWith.map(async (playedWith) => getSignificantPlayedWith(playedWith.steam_id, scraper))
  );
  return { root: rootPlayedWith, deep: deepPlayedWith };
};

export const getPlayersData = async (steamIds: SteamID[]): Promise<Promise<PlayerData>[]> => {
  // These APIs support multiple players at once
  const steamIds64 = steamIds.map((id) => id.getSteamID64());
  const [playerSummaries, playerBans] = await Promise.all([
    steam.getUserSummaryOrdered(steamIds64).catch(logErrorValue([], steamIds64)),
    steam.getUserBansOrdered(steamIds64).catch(logErrorValue([], steamIds64)),
  ]);
  const scraper = new CSGOStatsGGScraperCache({
    concurrency: 10,
    useLocalHero: true,
  });

  const playerDataPromises: Promise<PlayerData>[] = steamIds.map(async (steamId, index) => {
    const summary = playerSummaries[index];
    const playerBan = playerBans[index];
    const isPublic = summary?.visibilityState === 3;
    // TODO: below awaits are not concurrent
    return {
      steamId,
      createdAt: summary?.created
        ? new Date(summary.created * 1000)
        : await getPrivateCreationDate(steamId.accountid),
      summary,
      steamLevel: isPublic
        ? await steam.getUserLevel(steamId.getSteamID64()).catch(logError)
        : undefined,
      ownedGames: isPublic
        ? await steam.getUserOwnedGamesOptional(steamId.getSteamID64()).catch(logError)
        : undefined,
      recentGames: isPublic
        ? await steam.getUserRecentGames(steamId.getSteamID64()).catch(logError)
        : undefined,
      badges: isPublic
        ? await steam.getUserBadges(steamId.getSteamID64()).catch(logError)
        : undefined,
      friends: isPublic
        ? await steam.getUserFriendSummaries(steamId.getSteamID64()).catch(logError)
        : undefined,
      inventory: await inventory.getInventoryWithValue(steamId.getSteamID64()).catch(logError),
      playerBans: playerBan,
      csgoStatsPlayer: await scraper.getPlayer(steamId.getSteamID64()).catch(logError),
      csgoStatsDeepPlayedWith: await getDeepPlayedWith(steamId.getSteamID64(), scraper).catch(
        logError
      ),
      steamReputation: await steamrep.getReputation(steamId.getSteamID64()).catch(logError),
      faceit: await faceIt.getFaceitData(steamId.getSteamID64()).catch(logError),
    };
  });
  return playerDataPromises;
};

export const getPlayerData = async (resolvableId: string): Promise<PlayerData> => {
  const steamId64 = await steam.resolve(resolvableId);
  const steamId = new SteamID(steamId64);
  const [playerData] = await getPlayersData([steamId]);
  return playerData;
};
