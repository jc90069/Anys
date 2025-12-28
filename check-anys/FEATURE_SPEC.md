# Anys Premium - Personal AI Assistant

## Status: COMPLETE (waiting for API key)

## Features

| Feature | Description |
|---------|-------------|
| **Hybrid Model** | Sonnet (90%) + Opus (10% for complex) |
| **Long-term Memory** | Supabase database stores facts, preferences, decisions |
| **Security Gate** | Detects writing pattern changes, triggers verification |
| **Smart Routing** | Haiku detects complexity, routes to Opus |
| **Auto-learning** | Extracts & stores important info from conversations |
| **Rich Embeds** | Beautiful formatted responses |
| **Typing Delay** | Natural feel, not robotic |

## Architecture

```
Message received
    ↓
Update writing patterns → Check for anomaly
    ↓
[ANOMALY?] → Security verification question
    ↓
Build context from long-term memory
    ↓
Haiku checks: "Is this complex?"
    ↓
SIMPLE → Sonnet responds
COMPLEX → Opus responds (if under 10% cap)
    ↓
Extract memories from response → Store in Supabase
    ↓
Send embed with model indicator
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `anys_memory` | Facts, preferences, decisions, projects |
| `anys_conversations` | Daily summaries per channel |
| `anys_identity` | Writing patterns for security |
| `anys_security_events` | Anomaly logs |

## Security Gate

Detects:
- Sudden writing style changes
- Missing usual slang/patterns
- Unusually long/short messages
- Different punctuation habits

When triggered:
- Generates verification question from memory
- Logs event
- Blocks until verified

## Setup

### 1. Run Supabase SQL
```sql
-- Copy contents of supabase_setup.sql into Supabase SQL Editor
```

### 2. Add to .env
```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

### 3. Start
```bash
cd /Users/PROJECT-Claude/anys/check-anys
npm start
```

## Cost Estimate

~$0.75-3/day (Sonnet + 10% Opus + Haiku for routing)

## Files

```
check-anys/
├── auto_responder.js    # Main bot
├── memory.js            # Supabase memory system
├── supabase_setup.sql   # Database schema
├── package.json
└── .env
```
