require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const message = process.argv.slice(2).join(' ') || 'Hey!';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', async () => {
  const guild = client.guilds.cache.first();
  const channel = guild.channels.cache.find(c => c.name === 'anys');

  if (channel) {
    await channel.send(message);
    console.log(`Sent: ${message}`);
  }

  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
