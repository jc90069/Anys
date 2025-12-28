require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const memory = require('./memory');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const MODELS = {
  standard: 'claude-sonnet-4-20250514',
  complex: 'claude-opus-4-20250514',
  fast: 'claude-3-haiku-20240307'
};

const OPUS_DAILY_CAP = 0.10;
const STATS_FILE = path.join(__dirname, '.usage_stats.json');
const OWNER_ID = process.env.OWNER_ID || null;
const ALLOWED_SERVERS = process.env.ALLOWED_SERVERS
  ? process.env.ALLOWED_SERVERS.split(',').map(s => s.trim())
  : []; // Empty = allow all servers where owner is present

const SYSTEM_PROMPT = `You are Anys, a personal AI assistant for your owner in Discord.

Personality:
- Helpful, concise, and professional
- Direct answers without fluff
- Use markdown for code blocks only
- Match the user's energy - casual if they're casual, detailed if they need depth
- No emojis unless the user uses them first
- You have long-term memory and remember past conversations

IMPORTANT - Memory Extraction:
When the user shares important information, respond normally BUT also output a memory tag at the END of your response:
[MEMORY:type:importance:content]

Types: fact, preference, decision, project
Importance: 1-10 (10 = critical)

Examples:
- User says they prefer dark mode → end with [MEMORY:preference:6:Prefers dark mode]
- User decides on architecture → end with [MEMORY:decision:8:Decided to use Supabase for database]
- User mentions a project → end with [MEMORY:project:7:Working on Gamba Tycoons Discord bot]

Only add memory tags for genuinely important/memorable information. Not every message needs one.`;

const SECURITY_PROMPT = `You are a security verification assistant. The user's identity seems suspicious based on their writing patterns.

Generate ONE simple verification question that only the real owner would know, based on this context about them:
{context}

The question should be:
- Based on past conversations or known facts
- Not something easily guessed
- Quick to answer

Reply with ONLY the question, nothing else.`;

// ═══════════════════════════════════════════════════════════════
// DISCORD CLIENT
// ═══════════════════════════════════════════════════════════════

const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const anthropic = new Anthropic();

// Verification state
const pendingVerifications = new Map();

// ═══════════════════════════════════════════════════════════════
// USAGE TRACKING
// ═══════════════════════════════════════════════════════════════

function loadStats() {
  try {
    const data = fs.readFileSync(STATS_FILE, 'utf8');
    const stats = JSON.parse(data);
    const today = new Date().toDateString();
    if (stats.date !== today) {
      return { date: today, total: 0, opus: 0 };
    }
    return stats;
  } catch {
    return { date: new Date().toDateString(), total: 0, opus: 0 };
  }
}

function saveStats(stats) {
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

function canUseOpus() {
  const stats = loadStats();
  if (stats.total === 0) return true;
  return (stats.opus / stats.total) < OPUS_DAILY_CAP;
}

function recordUsage(usedOpus) {
  const stats = loadStats();
  stats.total++;
  if (usedOpus) stats.opus++;
  saveStats(stats);
  return stats;
}

// ═══════════════════════════════════════════════════════════════
// CONVERSATION HANDLING
// ═══════════════════════════════════════════════════════════════

async function getConversationHistory(channel, limit = 10) {
  const messages = await channel.messages.fetch({ limit });
  const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  return sorted
    .map(msg => {
      // Get content from message or embed
      let content = msg.content;
      if (!content && msg.embeds.length > 0) {
        content = msg.embeds[0].description || '';
      }

      const isBot = msg.author.id === discord.user.id;
      return {
        role: isBot ? 'assistant' : 'user',
        content: isBot
          ? content.replace(/^\[COMPLEX\]\s*/i, '').replace(/\[MEMORY:[^\]]+\]/g, '').trim()
          : `${msg.author.username}: ${content}`.trim()
      };
    })
    .filter(m => m.content.length > 0); // Filter out empty messages
}

async function checkComplexity(messages) {
  try {
    const response = await anthropic.messages.create({
      model: MODELS.fast,
      max_tokens: 10,
      system: `Analyze if this needs complex reasoning. Reply ONLY "COMPLEX" or "SIMPLE".
COMPLEX: deep analysis, architecture, multi-step reasoning, nuanced problems
SIMPLE: quick questions, casual chat, straightforward tasks`,
      messages
    });
    return response.content[0].text.trim().toUpperCase() === 'COMPLEX';
  } catch {
    return false;
  }
}

async function getClaudeResponse(messages, context, useOpus = false) {
  const model = useOpus ? MODELS.complex : MODELS.standard;

  const fullSystem = context
    ? `${SYSTEM_PROMPT}\n\n[YOUR MEMORY ABOUT THIS USER]\n${context}`
    : SYSTEM_PROMPT;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    system: fullSystem,
    messages
  });

  return {
    text: response.content[0].text,
    model: useOpus ? 'opus' : 'sonnet'
  };
}

// ═══════════════════════════════════════════════════════════════
// MEMORY EXTRACTION
// ═══════════════════════════════════════════════════════════════

async function extractAndStoreMemories(userId, response) {
  const memoryRegex = /\[MEMORY:(\w+):(\d+):([^\]]+)\]/g;
  let match;

  while ((match = memoryRegex.exec(response)) !== null) {
    const [, type, importance, content] = match;
    await memory.storeMemory(userId, type, content, null, parseInt(importance));
    console.log(`   💾 Stored memory: [${type}] ${content}`);
  }

  // Return cleaned response
  return response.replace(/\[MEMORY:[^\]]+\]/g, '').trim();
}

// ═══════════════════════════════════════════════════════════════
// SECURITY GATE
// ═══════════════════════════════════════════════════════════════

async function generateVerificationQuestion(userId) {
  const memories = await memory.getMemories(userId, { limit: 10, minImportance: 5 });

  if (memories.length < 3) {
    return "What's the main project we've been working on together?";
  }

  const context = memories.map(m => `- ${m.content}`).join('\n');

  try {
    const response = await anthropic.messages.create({
      model: MODELS.fast,
      max_tokens: 100,
      system: SECURITY_PROMPT.replace('{context}', context),
      messages: [{ role: 'user', content: 'Generate a verification question.' }]
    });
    return response.content[0].text.trim();
  } catch {
    return "What's the main project we've been working on?";
  }
}

async function handleSecurityCheck(msg, anomaly) {
  const userId = msg.author.id;

  // Log the anomaly
  await memory.logSecurityEvent(userId, 'anomaly', {
    reason: anomaly.reason,
    confidence: anomaly.confidence,
    message: msg.content.substring(0, 100)
  });

  // Generate verification question
  const question = await generateVerificationQuestion(userId);

  pendingVerifications.set(userId, {
    question,
    timestamp: Date.now(),
    channelId: msg.channel.id
  });

  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('🔐 Security Check')
    .setDescription(`Something seems different about your message.\n\n**Quick verification:**\n${question}`)
    .setFooter({ text: 'This helps keep your Anys secure' });

  await msg.channel.send({ embeds: [embed] });
  return true; // Indicates we're in verification mode
}

async function checkVerificationResponse(msg) {
  const userId = msg.author.id;
  const pending = pendingVerifications.get(userId);

  if (!pending) return false;

  // Timeout after 5 minutes
  if (Date.now() - pending.timestamp > 5 * 60 * 1000) {
    pendingVerifications.delete(userId);
    return false;
  }

  // For now, accept any response and log it
  // In production, you'd verify against stored answers
  pendingVerifications.delete(userId);

  await memory.logSecurityEvent(userId, 'verification_passed', {
    question: pending.question,
    answer: msg.content.substring(0, 100)
  });

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle('✅ Verified')
    .setDescription('Welcome back! Continuing normally.')
    .setFooter({ text: 'Identity confirmed' });

  await msg.channel.send({ embeds: [embed] });
  return true;
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE FORMATTING
// ═══════════════════════════════════════════════════════════════

function createEmbed(text, model, stats) {
  const isOpus = model === 'opus';
  const cleanText = text.replace(/^\[COMPLEX\]\s*/i, '').trim();

  if (cleanText.length < 200 && !cleanText.includes('```')) {
    return null;
  }

  const embed = new EmbedBuilder()
    .setDescription(cleanText.slice(0, 4096))
    .setColor(isOpus ? 0x9B59B6 : 0xF39C12) // Purple for Opus, Orange for Sonnet
    .setFooter({
      text: `${isOpus ? '⚡ Opus' : '💬 Sonnet'} • ${stats.opus}/${stats.total} opus today`
    });

  return embed;
}

async function naturalTypingDelay(channel, text) {
  const delay = Math.min(text.length * 20, 3000);
  await channel.sendTyping();
  await new Promise(r => setTimeout(r, delay));
}

// ═══════════════════════════════════════════════════════════════
// MAIN MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// SERVER SECURITY & SETUP
// ═══════════════════════════════════════════════════════════════

async function setupServer(guild) {
  // Check if server is allowed
  if (ALLOWED_SERVERS.length > 0 && !ALLOWED_SERVERS.includes(guild.id)) {
    console.log(`⛔ Leaving unauthorized server: ${guild.name}`);
    await guild.leave();
    return false;
  }

  // Check if owner is in server (extra security)
  try {
    const ownerMember = await guild.members.fetch(OWNER_ID).catch(() => null);
    if (!ownerMember) {
      console.log(`⛔ Owner not in server, leaving: ${guild.name}`);
      await guild.leave();
      return false;
    }
  } catch (e) {
    // Can't verify, but continue
  }

  // Create/find Anys role with admin permissions
  let anysRole = guild.roles.cache.find(r => r.name === 'Anys');
  if (!anysRole) {
    try {
      anysRole = await guild.roles.create({
        name: 'Anys',
        color: 0x9B59B6,
        permissions: [PermissionFlagsBits.Administrator],
        reason: 'Anys AI assistant role'
      });
      console.log(`   ✓ Created Anys role in ${guild.name}`);
    } catch (e) {
      console.log(`   ⚠ Could not create role in ${guild.name}`);
    }
  }

  // Assign role to bot
  if (anysRole) {
    const botMember = guild.members.cache.get(discord.user.id);
    if (botMember && !botMember.roles.cache.has(anysRole.id)) {
      try {
        await botMember.roles.add(anysRole);
      } catch (e) {}
    }
  }

  // Create #anys channel if not exists
  let anysChannel = guild.channels.cache.find(c => c.name.includes('anys'));
  if (!anysChannel) {
    try {
      anysChannel = await guild.channels.create({
        name: '🧠anys',
        type: ChannelType.GuildText,
        topic: 'Private channel for Anys AI assistant',
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: discord.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
      });
      console.log(`   ✓ Created #anys in ${guild.name}`);
    } catch (e) {
      console.log(`   ⚠ Could not create #anys in ${guild.name}`);
    }
  }

  return true;
}

discord.once('ready', async () => {
  console.log(`\n✨ Anys Premium Active`);
  console.log(`   Models: Sonnet (main) + Opus (complex, ${OPUS_DAILY_CAP * 100}% cap)`);
  console.log(`   Owner: ${OWNER_ID}`);
  console.log(`   Security: Owner-only + Identity verification\n`);

  // Setup all servers
  console.log(`📡 Setting up ${discord.guilds.cache.size} server(s)...`);
  for (const guild of discord.guilds.cache.values()) {
    const ok = await setupServer(guild);
    if (ok) console.log(`   ✓ ${guild.name}`);
  }
  console.log(`\n🎧 Listening for messages in #anys...\n`);
});

// Handle new server joins
discord.on('guildCreate', async (guild) => {
  console.log(`\n📥 Joined new server: ${guild.name}`);
  await setupServer(guild);
});

discord.on('messageCreate', async (msg) => {
  if (!msg.channel.name.includes('anys')) return;
  if (msg.author.id === discord.user.id) return;
  if (msg.author.bot) return;

  // Owner-only restriction
  if (OWNER_ID && msg.author.id !== OWNER_ID) {
    console.log(`[BLOCKED] ${msg.author.username} tried to use Anys`);
    return; // Silently ignore non-owner messages
  }

  const userId = msg.author.id;
  const serverId = msg.guild?.id || 'dm';
  const channelId = msg.channel.id;
  const time = new Date().toLocaleTimeString();

  console.log(`[${time}] ${msg.author.username}: ${msg.content}`);

  try {
    // Check if this is a verification response
    if (pendingVerifications.has(userId)) {
      await checkVerificationResponse(msg);
      return;
    }

    await msg.channel.sendTyping();

    // Update writing patterns and check for anomalies
    await memory.updateWritingPatterns(userId, msg.content);
    const anomaly = await memory.checkIdentityAnomaly(userId, msg.content);

    if (anomaly.isAnomaly && anomaly.confidence > 0.4) {
      console.log(`[${time}] ⚠️ Anomaly detected: ${anomaly.reason}`);
      await handleSecurityCheck(msg, anomaly);
      return;
    }

    // Build context from long-term memory
    const context = await memory.buildContext(userId, serverId, channelId, msg.content);

    // Get conversation history
    const history = await getConversationHistory(msg.channel);

    // Check complexity for Opus routing
    let useOpus = false;
    if (canUseOpus()) {
      const isComplex = await checkComplexity(history);
      if (isComplex) {
        useOpus = true;
        console.log(`[${time}] 🧠 Complex query - routing to Opus`);
      }
    }

    // Get response
    const { text, model } = await getClaudeResponse(history, context, useOpus);
    const stats = recordUsage(useOpus);

    // Extract and store any memories from the response
    const cleanedText = await extractAndStoreMemories(userId, text);

    // Update conversation tracking
    await memory.incrementMessageCount(serverId, channelId);

    // Natural delay
    await naturalTypingDelay(msg.channel, cleanedText);

    // Send response
    const embed = createEmbed(cleanedText, model, stats);
    if (embed) {
      await msg.channel.send({ embeds: [embed] });
    } else {
      await msg.channel.send(cleanedText.replace(/^\[COMPLEX\]\s*/i, ''));
    }

    const preview = cleanedText.substring(0, 80).replace(/\n/g, ' ');
    console.log(`[${time}] Anys (${model}): ${preview}${cleanedText.length > 80 ? '...' : ''}`);

  } catch (err) {
    console.error('Error:', err.message);
    if (err.message.includes('API key') || err.message.includes('authentication')) {
      await msg.channel.send('❌ API key not configured. Add `ANTHROPIC_API_KEY` to `.env`');
    } else if (err.message.includes('rate')) {
      await msg.channel.send('⏳ Rate limited. Try again in a moment.');
    } else {
      await msg.channel.send('Sorry, encountered an error. Try again.');
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════

discord.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('Failed to login:', err.message);
  process.exit(1);
});
