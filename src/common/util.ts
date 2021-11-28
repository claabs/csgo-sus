import SteamID from 'steamid';

export const parseStatus = (status: string): SteamID[] => {
  const steam2Ids = status.match(/(STEAM_[0-5]:[0-1]:[0-9]+)/g);
  if (!steam2Ids) return [];
  return steam2Ids.map((id) => new SteamID(id));
};
