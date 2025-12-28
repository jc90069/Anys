# Anys Project - Complete State

## Last Updated: 2024-12-26 03:30 UTC

---

## What Is Anys

Anys is a personal AI assistant system that lives in Discord, powered by Claude API. It's designed to be your always-available, context-aware companion across all your servers.

---

## Current Status: 90% Complete

### Working
- ✅ Discord bot running on Gamba Tycoons
- ✅ Claude API integrated (Sonnet + Opus hybrid)
- ✅ Smart routing (Haiku detects complexity)
- ✅ 10% Opus daily cap enforced
- ✅ Rich embeds with model indicators
- ✅ Natural typing delay
- ✅ Auto-memory extraction from responses

### Needs Fixing
- ❌ Supabase tables not created yet (run `node setup_tables.js`)
- ❌ Knowledge base not seeded

---

## Next Steps (In Order)

1. **Run setup_tables.js** to create Supabase tables
   ```bash
   cd /Users/PROJECT-Claude/anys/check-anys
   node setup_tables.js
   ```

2. **Restart auto_responder** to pick up working database
   ```bash
   pkill -f "node auto_responder.js"
   npm start
   ```

3. **Create knowledge.md** with your ecosystem info:
   - Your servers (Gamba Tycoons, others)
   - Your bots and what they do
   - Your projects and their status
   - Your network/business overview

4. **Deploy to all servers** - Create #anys channel on each

---

## Architecture

```
User message in #anys
        ↓
Update writing patterns
        ↓
Check for identity anomaly ──→ [Anomaly?] → Security verification
        ↓
Build context from long-term memory (Supabase)
        ↓
Fetch last 10 Discord messages
        ↓
Haiku checks complexity
        ↓
SIMPLE → Sonnet responds (~90%)
COMPLEX → Opus responds (~10%, capped)
        ↓
Extract [MEMORY:...] tags → Store in Supabase
        ↓
Send response (embed if long, plain if short)
```

---

## Files

```
/Users/PROJECT-Claude/anys/check-anys/
├── auto_responder.js     # Main bot (running)
├── memory.js             # Supabase memory system
├── setup_tables.js       # Creates database tables (run this next!)
├── supabase_setup.sql    # Raw SQL if needed
├── run_sql.js            # Table checker
├── anys_live.js          # Simple listener (legacy)
├── check_anys.js         # Manual message check
├── reply_anys.js         # Send message manually
├── create_anys_channel.js # Setup #anys on new server
├── package.json
├── .env                  # API keys (ANTHROPIC + SUPABASE)
├── .gitignore
├── FEATURE_SPEC.md       # Feature documentation
└── PROJECT_STATE.md      # This file
```

---

## Database Tables (To Be Created)

| Table | Purpose |
|-------|---------|
| `anys_memory` | Facts, preferences, decisions, projects |
| `anys_conversations` | Daily summaries per channel |
| `anys_identity` | Writing patterns for security gate |
| `anys_security_events` | Anomaly/verification logs |

---

## Configuration

### .env Keys
- `DISCORD_TOKEN` - Bot token ✅
- `ANTHROPIC_API_KEY` - Claude API ✅
- `SUPABASE_URL` - Database URL ✅
- `SUPABASE_SERVICE_KEY` - Database access ✅

### Models
- **Sonnet** (`claude-sonnet-4-20250514`) - Main responses
- **Opus** (`claude-opus-4-20250514`) - Complex queries (10% cap)
- **Haiku** (`claude-3-haiku-20240307`) - Complexity detection

---

## Cost Estimate

~$0.75-3/day with normal usage (Sonnet + 10% Opus + Haiku routing)

---

## Security Features

- **Writing pattern analysis** - Learns your style over ~20 messages
- **Anomaly detection** - Flags sudden style changes
- **Verification questions** - Generated from your memory
- **Event logging** - All security events stored

---

## The Vision

Anys is meant to be:
1. **Everywhere** - In all your Discord servers via #anys channels
2. **All-knowing** - Connected to your databases, knows your projects
3. **Secure** - Only you can interact, impersonation detected
4. **Persistent** - Remembers everything across sessions
5. **Smart** - Uses Opus for complex stuff, Sonnet for quick responses

---

## Resume Command

When you come back:
```bash
cd /Users/PROJECT-Claude/anys/check-anys
node setup_tables.js   # Create database tables
pkill -f auto_responder
npm start              # Restart bot
```

Then test in #anys on Discord!

---

GN! 🌙
