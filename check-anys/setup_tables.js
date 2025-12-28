require('dotenv').config();
const { Client } = require('pg');

const sql = `
-- Long-term memory
CREATE TABLE IF NOT EXISTS anys_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  context TEXT,
  importance INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation summaries
CREATE TABLE IF NOT EXISTS anys_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER DEFAULT 0,
  summary TEXT,
  key_topics TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remove unique constraint if exists and re-add
DO $$ BEGIN
  ALTER TABLE anys_conversations ADD CONSTRAINT anys_conversations_unique UNIQUE(server_id, channel_id, date);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Identity fingerprint
CREATE TABLE IF NOT EXISTS anys_identity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  writing_patterns JSONB DEFAULT '{}',
  common_phrases TEXT[] DEFAULT '{}',
  topics_of_interest TEXT[] DEFAULT '{}',
  secret_questions JSONB DEFAULT '[]',
  trust_score FLOAT DEFAULT 1.0,
  last_verified TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint on user_id if not exists
DO $$ BEGIN
  ALTER TABLE anys_identity ADD CONSTRAINT anys_identity_user_unique UNIQUE(user_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Security events
CREATE TABLE IF NOT EXISTS anys_security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_user ON anys_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_type ON anys_memory(type);
CREATE INDEX IF NOT EXISTS idx_conversations_lookup ON anys_conversations(server_id, channel_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_identity_user ON anys_identity(user_id);
`;

async function setup() {
  // Extract project ref from URL
  const projectRef = process.env.SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)[1];

  const client = new Client({
    host: `aws-0-eu-west-3.pooler.supabase.com`,
    port: 6543,
    database: 'postgres',
    user: `postgres.${projectRef}`,
    password: process.env.SUPABASE_SERVICE_KEY,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('Connected!\n');

    console.log('Creating tables...');
    await client.query(sql);
    console.log('✓ All tables created!\n');

    // Verify
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'anys_%'
    `);

    console.log('Tables verified:');
    rows.forEach(r => console.log(`  ✓ ${r.table_name}`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

setup();
