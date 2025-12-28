require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', async () => {
  const guild = client.guilds.cache.first();
  const channel = guild.channels.cache.find(c => c.name === 'anys');

  if (!channel) {
    console.log('❌ #anys not found');
    client.destroy();
    return;
  }

  const messages = await channel.messages.fetch({ limit: 10 });
  console.log(`📨 Last ${messages.size} messages in #anys:\n`);

  const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  for (const msg of sorted) {
    const time = new Date(msg.createdTimestamp).toLocaleTimeString();
    console.log(`[${time}] ${msg.author.username}: ${msg.content}`);
  }

  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
