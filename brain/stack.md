# My Tech Stack - APIs, Services & Credentials

> Anys reads this file to understand your infrastructure.
> **SECURITY**: This file contains sensitive info. Keep it local only.

---

## API Services

### Anthropic (Claude API)
| Field | Value |
|-------|-------|
| Used By | Anys Discord bot |
| Console | https://console.anthropic.com |
| Models | Sonnet 4, Opus 4, Haiku 3 |
| Cost | ~$0.75-3/day (Anys usage) |
| Key Location | `/Users/claude/Anys/check-anys/.env` |
| Status | ACTIVE |

### Google Cloud (Gemini API)
| Field | Value |
|-------|-------|
| Used By | gifit (AI animation) |
| Console | https://console.cloud.google.com |
| Billing Account | `01F72C-7C9B31-6423D8` |
| Key Location | `/Users/pinkmullet/gifit/.env` |
| Status | ACTIVE (but billing access issue) |
| Issue | Need `Billing Account User` role to manage |

### Discord API
| Field | Value |
|-------|-------|
| Console | https://discord.com/developers/applications |
| Cost | Free |
| Status | ACTIVE |

**Bots:**
| Bot | App ID | .env Location |
|-----|--------|---------------|
| Anys | `1454103551205838972` | `/Users/claude/Anys/check-anys/.env` |
| FLRbots | `1450560284279308612` | `/Users/claude/factory/FLRbots/.env` |
| Gamba-Tycoons | - | `/Users/claude/factory/FLRservers/Gamba-Tycoons/.env` |
| FLRcop | - | `/Users/claude/factory/FLRcop/.env` |

### Supabase
| Instance | Project Ref | Used By |
|----------|-------------|---------|
| FLRdataset | `ziarurgbmtesnjpmmkng` | FLRbots, Anys |
| Gamba-Tycoons | `qzedbkcvghmspjjxetpe` | Gamba-Tycoons bot |

Console: https://supabase.com/dashboard

---

## Servers & SSH

| Name | IP | Key | Purpose |
|------|-----|-----|---------|
| gambla_server | `159.89.143.102` | `~/.ssh/gambla_server` | Main VPS |
| gambla_server_2 | `38.60.200.225` | `~/.ssh/gambla_server` | Secondary |

**Quick Connect:**
```bash
ssh -i ~/.ssh/gambla_server root@159.89.143.102
ssh -i ~/.ssh/gambla_server root@38.60.200.225
```

---

## Local Services (No API)

| Tool | What | Cloud? |
|------|------|--------|
| Whisper | Voice transcription (anys) | Local only |
| ImageMagick | Fast GIF animation | Local only |
| ffmpeg | Audio/video processing | Local only |

---

## Cost Summary

| Service | Estimated Monthly |
|---------|-------------------|
| Anthropic | ~$20-90 (depends on Opus usage) |
| Google Cloud | ~$5-10 (Gemini) |
| Supabase | Free tier |
| Discord | Free |
| VPS (x2) | ~$? |

---

## Alerts & Anomalies

> Anys should flag these issues:

### Current Issues
- [ ] **GCP Billing Access**: Can't manage billing account `01F72C-7C9B31-6423D8`. Need to request access or create new billing account.

### Things to Watch
- Anthropic usage spikes (Opus is expensive)
- Supabase approaching free tier limits
- Discord bot token expiration

---

*Last updated: 2024-12-29*
