import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import {
  ApplicationCommandType,
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from 'discord-api-types/v9';
import 'dotenv/config';
import { packageJson } from '../common/util';

const token = process.env.DISCORD_BOT_TOKEN || 'missing';
const guild = process.env.DISCORD_DEV_GUILD_ID;

const helpSlashCommand = new SlashCommandBuilder()
  .setName('help')
  .setDescription(`How to use ${packageJson().name}`);

const userSlashCommand = new SlashCommandBuilder()
  .setName('user')
  .setDescription('Investigate a user using their Steam profile')
  .addStringOption((option) =>
    option.setName('id').setDescription('Any Steam ID version or profile link').setRequired(true)
  );

// @discordjs/builders doesn't support Message Commands yet: https://discord.com/developers/docs/interactions/application-commands#message-commands
const statusMessageCommandJson: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'Investigate status',
  type: ApplicationCommandType.Message,
};

const commands = [helpSlashCommand.toJSON(), userSlashCommand.toJSON(), statusMessageCommandJson];

export async function deployCommands(clientId: string) {
  const rest = new REST({ version: '9' }).setToken(token);
  if (guild) {
    await rest.put(Routes.applicationGuildCommands(clientId, guild), { body: commands });
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
  }
}
