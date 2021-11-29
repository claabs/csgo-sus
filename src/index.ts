import 'source-map-support/register';
// import fs from 'fs-extra';
import dotenv from 'dotenv';
import './discord/bot';
// import { getPlayersData } from './gather/index';
// import { analyzePlayers } from './analyze';

dotenv.config();

const status = `#  3 2 "Chuck Lubs" STEAM_1:1:19993736 07:55 31 0 active 786432
#  6 5 "Snowball" STEAM_1:0:19019648 07:55 55 0 active 196608
#  7 6 "baguette" STEAM_1:0:211200618 07:55 46 0 active 786432
#  8 7 "BabyPluto403" STEAM_1:0:465744591 07:55 65 0 active 196608
#  9 8 "Bill" STEAM_1:0:518085778 07:55 61 0 active 128000
# 10 9 "Smutno" STEAM_1:1:95220551 07:55 48 0 active 196608
# 11 10 "♥ 𝓑𝓮𝓮 ♥" STEAM_1:0:53041154 07:55 78 0 active 196608
# 12 11 "jake" STEAM_1:0:156206114 07:55 134 0 active 196608
# 13 12 "WORM" STEAM_1:0:30365447 07:55 32 0 active 786432
# 14 13 "noreilly" STEAM_1:1:547419869 07:52 61 0 active 196608`;

// getPlayersData(status)
//   .then((result) => {
//     fs.outputJSONSync('_gatherOutput.json', result, { spaces: 2 });
//     const analyzedPlayers = analyzePlayers(result);
//     fs.outputJSONSync('_analyzeOutput.json', analyzedPlayers, { spaces: 2 });
//     console.log('complete');
//   })
//   .catch((err) => console.error(err));
