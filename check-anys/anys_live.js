require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`👁️ LIVE monitoring #anys on ${client.guilds.cache.first().name}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

// Live message handler
client.on('messageCreate', async (msg) => {
  // Only #anys channel
  if (msg.channel.name !== 'anys') return;

  // Ignore bot's own messages
  if (msg.author.id === client.user.id) return;

  const time = new Date().toLocaleTimeString();
  const isPing = msg.mentions.has(client.user);

  if (isPing) {
    console.log('\n🔔🔔🔔 PING! 🔔🔔🔔');
    console.log(`[${time}] ${msg.author.username}: ${msg.content}`);
    console.log('🔔🔔🔔🔔🔔🔔🔔🔔🔔\n');
  } else {
    console.log(`[${time}] ${msg.author.username}: ${msg.content}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
