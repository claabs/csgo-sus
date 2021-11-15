import 'source-map-support/register';
import fs from 'fs-extra';
import { getPlayersData } from './player-data';

const status = `#  3 2 "Seven" STEAM_1:1:502217164 44:26 106 0 active 196608
#87 "Xavier" BOT active 64
# 88 4 "Apolo_O" STEAM_1:0:451296762 02:44 127 0 active 196608
# 85 5 "Virtux" STEAM_1:1:538852247 03:07 95 0 active 196608
# 18 6 "Weedeater" STEAM_1:0:448285430 40:38 64 0 active 196608
# 71 7 "THE_SHINGZZ" STEAM_1:1:62486677 11:19 62 0 active 196608
# 72 8 "jrƒrÆnk30" STEAM_1:1:149704264 07:55 131 0 active 196608
# 86 9 "Fnatic Alpaca" STEAM_1:1:569309966 03:07 151 0 active 196608
# 89 10 "YAINT" STEAM_1:1:149304083 01:07 51 0 active 786432
# 90 11 "Chuck Lubs" STEAM_1:1:19993736 00:13 43 0 active 786432
#84 "Ivan" BOT active 64`;

getPlayersData(status)
  .then((result) => fs.outputJSONSync('_output.json', result, { spaces: 2 }))
  .then(() => console.log('complete'))
  .catch((err) => console.error(err));
