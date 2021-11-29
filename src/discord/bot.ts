import { Client, ColorResolvable, EmbedFieldData, Intents, MessageEmbed } from 'discord.js';
import dotenv from 'dotenv';
import SteamID from 'steamid';
import { AnalysesEntry, analyzePlayers, PlayerAnalysis } from '../analyze';
import { parseStatus } from '../common/util';
import { getPlayersData } from '../gather';
import { deployCommands } from './deploy-commands';
import L from '../common/logger';

dotenv.config();

const token = process.env.DISCORD_BOT_TOKEN || 'missing';

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.once('ready', () => {
  L.info('Ready!');
});

// Login to Discord with your client's token
deployCommands().then(() => client.login(token));

export function mapAnalysisDetailsToField(
  prefixSymbol: string,
  analyses?: AnalysesEntry[]
): EmbedFieldData[] {
  if (!analyses || !analyses.length) return [];
  const fields: (EmbedFieldData | null)[] = analyses.map(([analysisType, details]) => {
    L.trace({ analysisType, details });
    const detailsEntries = Object.entries(details).filter(([key]) => key !== 'score');
    L.trace({ detailsEntries });
    if (!detailsEntries || !detailsEntries.length) return null;
    const detailsList = detailsEntries.reduce((acc, [key, value]) => {
      let valueString: string;
      try {
        if (typeof value === 'number') {
          valueString = Number.isInteger(value) ? value.toString() : value.toFixed(2);
        } else valueString = value.toString();
        return `${acc}• ${key}: ${valueString}\n`;
      } catch {
        return acc;
      }
    }, '');
    L.trace({ detailsList });

    if (!detailsList) return null;
    const field: EmbedFieldData = {
      name: `${prefixSymbol}${analysisType}`,
      value: detailsList,
    };
    L.trace({ field }, 'Mapped analysis detail to field');
    return field;
  });
  return fields.filter((elem): elem is EmbedFieldData => elem !== null);
}

export function analysisToEmbed(analysis: PlayerAnalysis): MessageEmbed {
  const { totalScore } = analysis;
  let color: ColorResolvable;
  if (totalScore < 0) color = 'RED';
  else if (totalScore < 10) color = 'ORANGE';
  else if (totalScore < 100) color = 'GREEN';
  else color = 'DARK_GREEN';

  L.trace({ color }, 'Chose color');

  const fields: EmbedFieldData[] = [
    {
      name: 'SussyScore',
      value: totalScore.toFixed(0),
    },
  ];
  L.trace('Mapping positive fields');
  const positiveFields = mapAnalysisDetailsToField('✅', analysis.positiveAnalyses);
  if (positiveFields && positiveFields.length) fields.push(...positiveFields);
  L.trace('Mapping negative fields');
  const negativeFields = mapAnalysisDetailsToField('❗', analysis.negativeAnalyses);
  L.trace('Pusing negative fields');
  if (negativeFields && negativeFields.length) fields.push(...negativeFields);

  L.trace('Creating embed');
  const embed = new MessageEmbed({
    color,
    author: {
      name: 'csgos.us',
      url: 'https://csgos.us',
    },
    thumbnail: {
      url: analysis.profileImage,
    },
    title: analysis.nickname,
    url: analysis.profileLink,
    // description: `${analysis.steamId.steam2()}/${analysis.steamId.steam3()}/${analysis.steamId.getSteamID64()}`,
    fields,
  });
  L.debug({ embed }, 'Created embed');
  return embed;
}

export async function investigateSteamIds(steamIds: SteamID[]): Promise<MessageEmbed[]> {
  L.debug({ steamIds }, 'Detected some steam IDs');
  const playersData = await getPlayersData(steamIds);
  L.debug('Gathered player data. Analyzing...');
  const analyzedResults = analyzePlayers(playersData);
  L.trace('Mapping results to embeds');
  const embeds = analyzedResults.map(analysisToEmbed);
  return embeds;
}

try {
  client.on('messageCreate', async (message) => {
    const steamIds = parseStatus(message.content);
    if (steamIds.length < 2) return;
    // Send a message containing the status message (if the bot has message permissions)
    L.info(`Detected ${steamIds.length} steamIds in a message, investigating...`);
    await message.channel.sendTyping();
    const embeds = await investigateSteamIds(steamIds);
    await message.reply({ embeds });
  });

  client.on('interactionCreate', async (interaction) => {
    if (interaction.isContextMenu()) {
      const { commandName } = interaction;
      if (commandName === 'Investigate status output') {
        // Right click on a message containing a status message
        const message = interaction.options.getMessage('message', true);
        const steamIds = parseStatus(message.content);
        L.info(`Investigating ${steamIds.length} steamId from Message Command`);
        if (!steamIds.length) return;
        L.trace('Deferring reply');
        await interaction.deferReply();
        const embeds = await investigateSteamIds(steamIds);
        L.trace('editing reply');
        await interaction.editReply({ embeds });
      }
    } else if (interaction.isCommand()) {
      const { commandName } = interaction;
      /**
       * Discord doesn't support multiline options, so no status command
       * https://github.com/discord/discord-api-docs/issues/2381
       * Instead, it supports detecting message content, or right click menu
       */
      if (commandName === 'user') {
        // Use the /user command
        await interaction.deferReply();
        await interaction.reply('To be implemented');
      }
    }
  });
} catch (err) {
  L.error(err);
}
