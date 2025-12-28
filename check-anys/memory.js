const { createClient } = require('@supabase/supabase-js');

// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ═══════════════════════════════════════════════════════════════
// MEMORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function storeMemory(userId, type, content, context = null, importance = 5) {
  const { error } = await supabase
    .from('anys_memory')
    .insert({ user_id: userId, type, content, context, importance });

  if (error) console.error('Memory store error:', error.message);
  return !error;
}

async function getMemories(userId, options = {}) {
  const { type, limit = 20, minImportance = 1 } = options;

  let query = supabase
    .from('anys_memory')
    .select('*')
    .eq('user_id', userId)
    .gte('importance', minImportance)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) console.error('Memory fetch error:', error.message);
  return data || [];
}

async function searchMemories(userId, searchTerms) {
  const { data, error } = await supabase
    .from('anys_memory')
    .select('*')
    .eq('user_id', userId)
    .or(searchTerms.map(t => `content.ilike.%${t}%`).join(','))
    .order('importance', { ascending: false })
    .limit(10);

  if (error) console.error('Memory search error:', error.message);
  return data || [];
}

// ═══════════════════════════════════════════════════════════════
// CONVERSATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function updateConversationSummary(serverId, channelId, summary, topics) {
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('anys_conversations')
    .upsert({
      server_id: serverId,
      channel_id: channelId,
      date: today,
      summary,
      key_topics: topics,
      message_count: 1,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'server_id,channel_id,date'
    });

  if (error) console.error('Conversation update error:', error.message);
}

async function incrementMessageCount(serverId, channelId) {
  const today = new Date().toISOString().split('T')[0];

  // First try to increment
  const { data, error } = await supabase.rpc('increment_message_count', {
    p_server_id: serverId,
    p_channel_id: channelId,
    p_date: today
  });

  // If RPC doesn't exist, fall back to upsert
  if (error) {
    await supabase
      .from('anys_conversations')
      .upsert({
        server_id: serverId,
        channel_id: channelId,
        date: today,
        message_count: 1
      }, { onConflict: 'server_id,channel_id,date' });
  }
}

async function getRecentConversations(serverId, channelId, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('anys_conversations')
    .select('*')
    .eq('server_id', serverId)
    .eq('channel_id', channelId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (error) console.error('Conversation fetch error:', error.message);
  return data || [];
}

// ═══════════════════════════════════════════════════════════════
// IDENTITY / SECURITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function getIdentity(userId) {
  const { data, error } = await supabase
    .from('anys_identity')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Identity fetch error:', error.message);
  }
  return data;
}

async function updateIdentity(userId, updates) {
  const { error } = await supabase
    .from('anys_identity')
    .upsert({
      user_id: userId,
      ...updates,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) console.error('Identity update error:', error.message);
  return !error;
}

async function updateWritingPatterns(userId, message) {
  const identity = await getIdentity(userId) || { writing_patterns: {} };
  const patterns = identity.writing_patterns || {};

  // Analyze message patterns
  const words = message.toLowerCase().split(/\s+/);
  const avgWordLength = words.reduce((a, w) => a + w.length, 0) / words.length;
  const usesSlang = /\b(wsp|nah|idk|btw|lol|lmao|bruh|yo)\b/i.test(message);
  const usesPunctuation = /[.!?]$/.test(message.trim());
  const isShort = message.length < 50;
  const usesEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(message);

  // Update running averages
  const n = (patterns.messageCount || 0) + 1;
  patterns.messageCount = n;
  patterns.avgWordLength = ((patterns.avgWordLength || avgWordLength) * (n - 1) + avgWordLength) / n;
  patterns.slangRate = ((patterns.slangRate || 0) * (n - 1) + (usesSlang ? 1 : 0)) / n;
  patterns.punctuationRate = ((patterns.punctuationRate || 0) * (n - 1) + (usesPunctuation ? 1 : 0)) / n;
  patterns.shortMessageRate = ((patterns.shortMessageRate || 0) * (n - 1) + (isShort ? 1 : 0)) / n;
  patterns.emojiRate = ((patterns.emojiRate || 0) * (n - 1) + (usesEmoji ? 1 : 0)) / n;

  // Track common phrases
  const phrases = identity.common_phrases || [];
  const twoWordPhrases = [];
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i].length > 2 && words[i + 1].length > 2) {
      twoWordPhrases.push(`${words[i]} ${words[i + 1]}`);
    }
  }

  await updateIdentity(userId, {
    writing_patterns: patterns,
    common_phrases: [...new Set([...phrases, ...twoWordPhrases])].slice(-50)
  });

  return patterns;
}

async function checkIdentityAnomaly(userId, message) {
  const identity = await getIdentity(userId);
  if (!identity || !identity.writing_patterns.messageCount || identity.writing_patterns.messageCount < 20) {
    // Not enough data to check
    return { isAnomaly: false, reason: null, confidence: 0 };
  }

  const patterns = identity.writing_patterns;
  const anomalies = [];

  // Analyze current message
  const words = message.toLowerCase().split(/\s+/);
  const avgWordLength = words.reduce((a, w) => a + w.length, 0) / words.length;
  const usesSlang = /\b(wsp|nah|idk|btw|lol|lmao|bruh|yo)\b/i.test(message);
  const usesPunctuation = /[.!?]$/.test(message.trim());
  const isShort = message.length < 50;

  // Check for significant deviations
  if (Math.abs(avgWordLength - patterns.avgWordLength) > 2) {
    anomalies.push('unusual word length');
  }
  if (patterns.slangRate > 0.5 && !usesSlang) {
    anomalies.push('missing usual slang');
  }
  if (patterns.slangRate < 0.1 && usesSlang) {
    anomalies.push('unexpected slang');
  }
  if (patterns.shortMessageRate > 0.7 && message.length > 200) {
    anomalies.push('unusually long message');
  }
  if (patterns.punctuationRate < 0.2 && usesPunctuation) {
    anomalies.push('unusual punctuation');
  }

  const confidence = anomalies.length / 5;
  return {
    isAnomaly: anomalies.length >= 2,
    reason: anomalies.join(', '),
    confidence
  };
}

async function logSecurityEvent(userId, eventType, details) {
  const { error } = await supabase
    .from('anys_security_events')
    .insert({ user_id: userId, event_type: eventType, details });

  if (error) console.error('Security log error:', error.message);
}

async function setSecretQuestion(userId, question, answerHash) {
  const identity = await getIdentity(userId) || { secret_questions: [] };
  const questions = identity.secret_questions || [];

  questions.push({ question, answerHash, created: new Date().toISOString() });

  await updateIdentity(userId, {
    secret_questions: questions.slice(-5) // Keep last 5
  });
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════

async function buildContext(userId, serverId, channelId, currentMessage) {
  const [memories, conversations] = await Promise.all([
    getMemories(userId, { limit: 15, minImportance: 3 }),
    getRecentConversations(serverId, channelId, 7)
  ]);

  // Search for relevant memories based on current message
  const keywords = currentMessage.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 4)
    .slice(0, 5);

  let relevantMemories = [];
  if (keywords.length > 0) {
    relevantMemories = await searchMemories(userId, keywords);
  }

  // Build context string
  let context = '';

  if (memories.length > 0) {
    context += '\n[LONG-TERM MEMORY]\n';
    memories.forEach(m => {
      context += `- ${m.type}: ${m.content}\n`;
    });
  }

  if (relevantMemories.length > 0) {
    context += '\n[RELEVANT TO THIS CONVERSATION]\n';
    relevantMemories.forEach(m => {
      context += `- ${m.content}\n`;
    });
  }

  if (conversations.length > 0) {
    context += '\n[RECENT CONVERSATION SUMMARIES]\n';
    conversations.forEach(c => {
      if (c.summary) {
        context += `- ${c.date}: ${c.summary}\n`;
      }
    });
  }

  return context;
}

module.exports = {
  storeMemory,
  getMemories,
  searchMemories,
  updateConversationSummary,
  incrementMessageCount,
  getRecentConversations,
  getIdentity,
  updateIdentity,
  updateWritingPatterns,
  checkIdentityAnomaly,
  logSecurityEvent,
  setSecretQuestion,
  buildContext
};
