import SteamID from 'steamid';
import 'dotenv/config';
import { AxiosError } from 'axios';
import TinyGradient from 'tinygradient';
import fs from 'fs-extra';
import path from 'path';
import type { PackageJson } from 'types-package-json';
import Keyv from 'keyv';
import L from './logger';

export const parseStatus = (status: string): SteamID[] => {
  const steam2Ids = status.match(/(STEAM_[0-5]:[0-1]:[0-9]+)/g);
  if (!steam2Ids) return [];
  return steam2Ids.map((id) => new SteamID(id));
};

export const getCacheDir = (): string => {
  return process.env.CACHE_DIR || '/tmp';
};

export const cleanAxiosResponse = (err: AxiosError) => {
  const { response } = err;
  return {
    status: response?.status,
    headers: response?.headers,
    data: response?.data,
  };
};

export const getScoreColor = (totalScore: number): string => {
  const MIN_SCORE = -100;
  const MAX_SCORE = 500;
  const SCORE_RANGE = Math.abs(MIN_SCORE) + Math.abs(MAX_SCORE);
  const ZERO_POS = Math.abs(MIN_SCORE) / SCORE_RANGE;
  const colorGradient = new TinyGradient([
    { color: '#222222', pos: 0 },
    { color: 'red', pos: ZERO_POS / 2 },
    { color: 'yellow', pos: ZERO_POS },
    { color: 'blue', pos: 1 },
  ]);
  const colorPos =
    (Math.min(MAX_SCORE, Math.max(MIN_SCORE, totalScore)) + SCORE_RANGE * ZERO_POS) / SCORE_RANGE;
  L.trace({ colorPos });
  const color = colorGradient.hsvAt(colorPos).toHexString();
  return color;
};

let packageJsonCache: PackageJson | undefined;
export const packageJson = (): PackageJson => {
  if (packageJsonCache) return packageJsonCache;
  packageJsonCache = fs.readJSONSync(path.resolve(process.cwd(), `package.json`));
  return packageJsonCache as PackageJson;
};

export const getVersion = (): string => {
  const { COMMIT_SHA } = process.env;
  let { version } = packageJson();
  if (COMMIT_SHA) version = `${version}#${COMMIT_SHA.substring(0, 8)}`;
  return version;
};

export const range = (start: number, stop: number, step?: number): number[] => {
  const a = [start];
  let b = start;
  while (b < stop) {
    a.push((b += step || 1));
  }
  return a;
};

export interface GetCacheProps {
  namespace?: string;
  ttl?: number;
}

export const getCache = (props?: GetCacheProps): Keyv => {
  const keyv = new Keyv(`sqlite://${getCacheDir()}/csgo-sus-cache.sqlite`, {
    namespace: props?.namespace,
    ttl: props?.ttl,
    // Single quotes in the JSON object break the DB query. We have to base64 encode it to use Keyv properly.
    serialize: (data) => Buffer.from(JSON.stringify(data), 'utf8').toString('base64'),
    deserialize: (data) => JSON.parse(Buffer.from(data, 'base64').toString('utf8')),
  });
  keyv.on('error', (err) => L.error(err));
  return keyv;
};
