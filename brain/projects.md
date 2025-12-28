# Projects Overview

> Detailed breakdown of all projects Anys should know about.

---

## Active Projects

### Anys
**Path:** `/Users/claude/Anys/`
**Status:** RUNNING

Personal AI assistant with two components:
1. **Discord Bot** (`check-anys/`) - Claude-powered assistant in #anys channels
2. **Voice Tool** (`~/bin/anys`) - Local Whisper transcription

**Tech Stack:**
- Discord.js + Anthropic API (Claude)
- Supabase for memory
- Local Whisper for voice

**Key Files:**
- `check-anys/auto_responder.js` - Main bot
- `check-anys/memory.js` - Long-term memory
- `brain/` - Knowledge base (you're reading it)

---

### Factory
**Path:** `/Users/claude/factory/`
**Status:** ACTIVE

Discord bot factory for rapid deployment.

**Components:**
| Component | Purpose |
|-----------|---------|
| FLRbots | Cross-server XP/leveling |
| FLRcop | Moderation + server analysis |
| FLRservers/ | Per-server custom bots |
| FLR-branding | Logo/asset library |
| ban-list | Global ban list |

**Key Docs:**
- `FACTORY_VISION.md` - Strategy & security
- `CLAUDE.md` - Project context

---

### gifit
**Path:** `/Users/pinkmullet/gifit/`
**Status:** ACTIVE

GIF animation tool with two modes:

| Mode | Engine | Speed | Use Case |
|------|--------|-------|----------|
| `gifit veo` | Gemini AI | Slow | Creative animations |
| `gifit image` | ImageMagick | Fast | Mechanical effects |

---

### Gamba-Tycoons
**Path:** `/Users/claude/factory/FLRservers/Gamba-Tycoons/`
**Status:** ACTIVE

Discord bot for gambling community server.

---

### immo-artisan
**Path:** `/Users/claude/immo-artisan/`
**Status:** ACTIVE

French real estate location finder (standalone).

---

### paws-quiz
**Path:** `/Users/claude/paws-quiz/`
**Status:** ACTIVE

Kid-friendly dog/cat breed quiz game.

---

## Blocked Projects

### ComfyUI
**Path:** `/Users/claude/ComfyUI/`
**Status:** BLOCKED

AI image generation. Blocked due to:
- Intel Mac (no MPS acceleration)
- PyTorch max 2.2.2

**Workaround:** Use Gemini API via gifit instead.

---

## Dormant Projects

| Project | Path | Notes |
|---------|------|-------|
| MAXX | `/Users/claude/MAXX/` | Stranger Things game |
| olympe-game | `/Users/claude/olympe-game/` | Web game |
| shi | `/Users/claude/shi/` | Emoji experiments |
| voicebot | `/Users/claude/voicebot/` | Discord voice bot |

---

*Last updated: 2024-12-29*
