import SteamID from 'steamid';
import dotenv from 'dotenv';
import { AxiosError } from 'axios';
import TinyGradient from 'tinygradient';
import fs from 'fs-extra';
import path from 'path';
import type { PackageJson } from 'types-package-json';
import L from './logger';

dotenv.config();

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
  if (COMMIT_SHA) version = `${version}#${COMMIT_SHA}`;
  return version;
};
