import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import {
  ApplicationCommandType,
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from 'discord-api-types/v9';
import dotenv from 'dotenv';

dotenv.config();

const clientId = process.env.DISCORD_CLIENT_ID || 'missing';
const token = process.env.DISCORD_BOT_TOKEN || 'missing';
const guild = process.env.DISCORD_DEV_GUILD_ID;

const userSlashCommand = new SlashCommandBuilder()
  .setName('user')
  .setDescription('Investigate a user using their Steam profile')
  .addStringOption((option) =>
    option
      .setName('id')
      .setDescription('Steam ID, account ID, username, or profile link')
      .setRequired(true)
  );

// @discordjs/builders doesn't support Message Commands yet: https://discord.com/developers/docs/interactions/application-commands#message-commands
const statusMessageCommandJson: RESTPostAPIApplicationCommandsJSONBody = {
  name: 'Investigate status output',
  type: ApplicationCommandType.Message,
};

const commands = [userSlashCommand.toJSON(), statusMessageCommandJson];

const rest = new REST({ version: '9' }).setToken(token);

export async function deployCommands() {
  if (guild) {
    await rest.put(Routes.applicationGuildCommands(clientId, guild), { body: commands });
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
  }
}
