require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers]
});

client.once('ready', async () => {
  const guild = client.guilds.cache.first();
  console.log(`Server: ${guild.name}`);

  // Check if channel exists
  let channel = guild.channels.cache.find(c => c.name === 'anys');

  if (channel) {
    console.log(`Channel #anys already exists`);
  } else {
    // Create private channel - only visible to admins and bot
    channel = await guild.channels.create({
      name: 'anys',
      type: ChannelType.GuildText,
      topic: 'Private channel for Anys & Claude',
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: client.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        }
      ]
    });
    console.log(`Created #anys channel (ID: ${channel.id})`);
  }

  // Send welcome message
  await channel.send(`👋 **Anys Channel Active**\n\nI'll monitor messages here. Talk to me anytime!`);
  console.log('Welcome message sent');

  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
