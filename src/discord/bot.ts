import { Client, Intents } from 'discord.js';
import dotenv from 'dotenv';
import { parseStatus } from '../common/util';
import { deployCommands } from './deploy-commands';

dotenv.config();

const token = process.env.DISCORD_BOT_TOKEN || 'missing';

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.once('ready', () => {
  console.log('Ready!');
});

// Login to Discord with your client's token
deployCommands().then(() => client.login(token));

client.on('messageCreate', async (message) => {
  const steamIds = parseStatus(message.content);
  if (steamIds.length < 2) return;
  // Send a message containing the status message (if the bot has message permissions)
  await message.reply('Detected status command');
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isContextMenu()) {
    const { commandName } = interaction;
    if (commandName === 'Investigate status output') {
      // Right click on a message containing a status message
      const message = interaction.options.getMessage('message', true).content;
      await interaction.reply(message);
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
      await interaction.reply('User info.');
    }
  }
});
