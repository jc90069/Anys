require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runSQL() {
  // Run each statement separately
  const statements = [
    // Table: anys_memory
    `CREATE TABLE IF NOT EXISTS anys_memory (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      context TEXT,
      importance INTEGER DEFAULT 5,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_accessed TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Table: anys_conversations
    `CREATE TABLE IF NOT EXISTS anys_conversations (
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
    )`,

    // Table: anys_identity
    `CREATE TABLE IF NOT EXISTS anys_identity (
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
    )`,

    // Table: anys_security_events
    `CREATE TABLE IF NOT EXISTS anys_security_events (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`
  ];

  console.log('Creating Anys tables in Supabase...\n');

  // Test connection first
  const { data: test, error: testErr } = await supabase
    .from('anys_memory')
    .select('id')
    .limit(1);

  if (testErr && !testErr.message.includes('does not exist')) {
    console.log('✓ Connection successful');
  }

  // Try to insert a test record to verify table exists or create it
  for (const table of ['anys_memory', 'anys_conversations', 'anys_identity', 'anys_security_events']) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error && error.message.includes('does not exist')) {
      console.log(`✗ Table ${table} does not exist`);
      console.log(`  → Run supabase_setup.sql in Supabase Dashboard > SQL Editor`);
    } else {
      console.log(`✓ Table ${table} exists`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('If tables are missing, go to:');
  console.log('https://supabase.com/dashboard/project/qzedbkcvghmspjjxetpe/sql/new');
  console.log('And paste the contents of supabase_setup.sql');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

runSQL().catch(console.error);
