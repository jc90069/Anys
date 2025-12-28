require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

let lastMessageId = null;

client.once('ready', async () => {
  const guild = client.guilds.cache.first();
  const channel = guild.channels.cache.find(c => c.name === 'anys');

  if (!channel) {
    console.log('❌ #anys channel not found');
    process.exit(1);
  }

  console.log(`👁️ Monitoring #anys on ${guild.name}...`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get last message ID
  const recent = await channel.messages.fetch({ limit: 1 });
  if (recent.size > 0) {
    lastMessageId = recent.first().id;
  }

  // Poll every 5 seconds
  setInterval(async () => {
    try {
      const options = lastMessageId ? { after: lastMessageId, limit: 10 } : { limit: 1 };
      const messages = await channel.messages.fetch(options);

      if (messages.size > 0) {
        // Sort by timestamp and print
        const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        for (const msg of sorted) {
          if (msg.author.id !== client.user.id) {
            const time = new Date(msg.createdTimestamp).toLocaleTimeString();
            console.log(`[${time}] ${msg.author.username}: ${msg.content}`);
          }
          lastMessageId = msg.id;
        }
      }
    } catch (err) {
      // Ignore errors
    }
  }, 5000);
});

client.login(process.env.DISCORD_TOKEN);
