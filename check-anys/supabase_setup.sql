-- ═══════════════════════════════════════════════════════════════
-- ANYS MEMORY SYSTEM - SUPABASE TABLES
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Long-term memory: facts, preferences, decisions I learn about you
CREATE TABLE IF NOT EXISTS anys_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fact', 'preference', 'decision', 'project', 'pattern')),
  content TEXT NOT NULL,
  context TEXT,
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation summaries: compressed history for context
CREATE TABLE IF NOT EXISTS anys_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER DEFAULT 0,
  summary TEXT,
  key_topics TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, channel_id, date)
);

-- Identity fingerprint: your unique patterns for security
CREATE TABLE IF NOT EXISTS anys_identity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  writing_patterns JSONB DEFAULT '{}',
  common_phrases TEXT[] DEFAULT '{}',
  topics_of_interest TEXT[] DEFAULT '{}',
  secret_questions JSONB DEFAULT '[]',
  trust_score FLOAT DEFAULT 1.0,
  last_verified TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security events: log suspicious activity
CREATE TABLE IF NOT EXISTS anys_security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('anomaly', 'verification_triggered', 'verification_passed', 'verification_failed')),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_memory_user ON anys_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_type ON anys_memory(type);
CREATE INDEX IF NOT EXISTS idx_memory_importance ON anys_memory(importance DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_lookup ON anys_conversations(server_id, channel_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_identity_user ON anys_identity(user_id);

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES (optional but recommended)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE anys_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE anys_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE anys_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE anys_security_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role access" ON anys_memory FOR ALL USING (true);
CREATE POLICY "Service role access" ON anys_conversations FOR ALL USING (true);
CREATE POLICY "Service role access" ON anys_identity FOR ALL USING (true);
CREATE POLICY "Service role access" ON anys_security_events FOR ALL USING (true);
