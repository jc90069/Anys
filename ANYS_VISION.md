# Anys Vision: Local AI Operating System

> The complete architecture for a high-end, extensible personal AI assistant.
> Designed for M4 Max 64GB MacBook Pro.

---

## What Is Anys

Anys is not a chatbot. It's an **AI layer** that sits between you and your entire digital life:

- **Always running** on your Mac
- **Knows everything** about you (projects, preferences, history)
- **Can take actions** (not just chat)
- **Works offline** (local LLMs)
- **Available everywhere** (voice, CLI, Discord)
- **Grows with you** (plugin architecture)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ANYS CORE SYSTEM                                  │
│                     (Always running on your Mac)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                      INTELLIGENCE LAYER                                ║  │
│  ╠═══════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                        ║  │
│  ║   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               ║  │
│  ║   │ LOCAL LLM   │    │ CLAUDE API  │    │ SPECIALIZED │               ║  │
│  ║   │             │    │             │    │   MODELS    │               ║  │
│  ║   │ Llama 70B   │    │ Opus/Sonnet │    │             │               ║  │
│  ║   │ (M4 Max)    │    │ (Complex)   │    │ DeepSeek    │               ║  │
│  ║   │             │    │             │    │ Coder 33B   │               ║  │
│  ║   │ FREE        │    │ PAID        │    │ FREE        │               ║  │
│  ║   │ INSTANT     │    │ BEST BRAIN  │    │ CODE EXPERT │               ║  │
│  ║   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘               ║  │
│  ║          │                  │                  │                       ║  │
│  ║          └──────────────────┼──────────────────┘                       ║  │
│  ║                             ▼                                          ║  │
│  ║                 ┌───────────────────────┐                              ║  │
│  ║                 │     SMART ROUTER      │                              ║  │
│  ║                 │                       │                              ║  │
│  ║                 │ • Task complexity     │                              ║  │
│  ║                 │ • Latency needs       │                              ║  │
│  ║                 │ • Cost optimization   │                              ║  │
│  ║                 │ • Offline fallback    │                              ║  │
│  ║                 └───────────────────────┘                              ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                        MEMORY LAYER                                    ║  │
│  ╠═══════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                        ║  │
│  ║   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               ║  │
│  ║   │ VECTOR DB   │    │ KNOWLEDGE   │    │  EPISODIC   │               ║  │
│  ║   │             │    │   GRAPH     │    │   MEMORY    │               ║  │
│  ║   │ ChromaDB    │    │             │    │             │               ║  │
│  ║   │             │    │ People →    │    │ Timeline of │               ║  │
│  ║   │ Semantic    │    │ Projects →  │    │ everything  │               ║  │
│  ║   │ search over │    │ Decisions → │    │ you've done │               ║  │
│  ║   │ EVERYTHING  │    │ Outcomes    │    │             │               ║  │
│  ║   └─────────────┘    └─────────────┘    └─────────────┘               ║  │
│  ║                                                                        ║  │
│  ║   ┌─────────────┐    ┌─────────────┐                                  ║  │
│  ║   │ BRAIN FILES │    │ CONVERSATION│                                  ║  │
│  ║   │  (Markdown) │    │   HISTORY   │                                  ║  │
│  ║   └─────────────┘    └─────────────┘                                  ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                        ACTION LAYER                                    ║  │
│  ╠═══════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                        ║  │
│  ║   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               ║  │
│  ║   │   SYSTEM    │    │    APPS     │    │   FILES     │               ║  │
│  ║   │ AppleScript │    │ Open/close  │    │ CRUD ops    │               ║  │
│  ║   └─────────────┘    └─────────────┘    └─────────────┘               ║  │
│  ║                                                                        ║  │
│  ║   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               ║  │
│  ║   │  WEB/APIs   │    │   DISCORD   │    │  SCHEDULER  │               ║  │
│  ║   │ Fetch data  │    │ Bridge bot  │    │ Reminders   │               ║  │
│  ║   └─────────────┘    └─────────────┘    └─────────────┘               ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                      PERCEPTION LAYER                                  ║  │
│  ╠═══════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                        ║  │
│  ║   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               ║  │
│  ║   │   VOICE     │    │   SCREEN    │    │ FILE WATCH  │               ║  │
│  ║   │ "Hey Anys"  │    │ Vision LLM  │    │ Monitor     │               ║  │
│  ║   │ Whisper     │    │             │    │ directories │               ║  │
│  ║   └─────────────┘    └─────────────┘    └─────────────┘               ║  │
│  ║                                                                        ║  │
│  ║   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               ║  │
│  ║   │  CLIPBOARD  │    │  CALENDAR   │    │   CONTEXT   │               ║  │
│  ║   │ Monitor     │    │ Events      │    │ Current app │               ║  │
│  ║   └─────────────┘    └─────────────┘    └─────────────┘               ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           ▼                          ▼                          ▼
    ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
    │    VOICE    │            │     CLI     │            │   DISCORD   │
    │  "Hey Anys" │            │   $ anys    │            │   #anys     │
    │   LOCAL     │            │   LOCAL     │            │   HYBRID    │
    └─────────────┘            └─────────────┘            └─────────────┘
```

---

## Hardware: M4 Max 64GB

Models that can run simultaneously:

| Model | Purpose | VRAM | Speed |
|-------|---------|------|-------|
| Llama 3.1 70B Q4 | Main reasoning | ~40GB | ~15 tok/s |
| Llama 3.1 8B | Fast responses | ~6GB | ~80 tok/s |
| DeepSeek Coder 33B | Code expert | ~20GB | ~25 tok/s |
| Whisper Large V3 | Voice transcription | ~3GB | Real-time |
| Nomic Embed | Vector embeddings | ~500MB | Instant |

---

## Plugin Architecture

Everything is a plugin. Core is minimal and stable.

```
plugins/
├── models/           # LLM integrations
│   ├── ollama/
│   ├── claude-api/
│   ├── gemini/
│   └── whisper-local/
│
├── actions/          # What Anys can DO
│   ├── macos-control/
│   ├── file-manager/
│   ├── discord-bridge/
│   ├── git-operations/
│   └── ssh-remote/
│
├── perceptions/      # How Anys SEES
│   ├── voice-input/
│   ├── clipboard-monitor/
│   ├── screen-capture/
│   └── file-watcher/
│
├── memory/           # How Anys REMEMBERS
│   ├── chromadb/
│   ├── supabase/
│   └── local-sqlite/
│
└── interfaces/       # How you INTERACT
    ├── cli/
    ├── voice/
    ├── discord/
    └── menubar/
```

### Plugin Manifest Example

```yaml
# plugins/models/gemini/manifest.yaml
name: gemini
version: "1.0.0"
description: Google Gemini API with vision

provides:
  models:
    - id: gemini-pro
      type: text
    - id: gemini-pro-vision
      type: multimodal

requires:
  env:
    - GEMINI_API_KEY

config:
  api_key:
    type: string
    env: GEMINI_API_KEY
    required: true
```

---

## Master Configuration

```yaml
# config/anys.yaml
version: "1.0"

hardware:
  chip: "Apple M4 Max"
  memory_gb: 64

intelligence:
  router:
    strategy: auto

  assignments:
    primary: ollama/llama-70b
    fast: ollama/llama-8b
    code: ollama/deepseek-coder
    complex: claude-api/opus
    vision: gemini/pro-vision
    voice_stt: whisper-local/large-v3

memory:
  primary: chromadb
  retention:
    conversations: 365

voice:
  wake_word: "hey anys"
  stt: whisper-local/large-v3
  tts: macos-say

plugins:
  enabled:
    - models/ollama
    - models/claude-api
    - actions/macos-control
    - actions/file-manager
    - perceptions/voice-input
    - memory/chromadb
    - interfaces/cli
    - interfaces/voice

self_improvement:
  enabled: true
  can_suggest:
    - new_plugins
    - model_upgrades
    - config_changes
```

---

## CLI Examples

```bash
# Basic chat
$ anys "what should I work on today?"

# Task management
$ anys "remind me to check server logs tomorrow at 9am"
$ anys tasks

# Search everything
$ anys search "supabase migration"

# Plugin management
$ anys plugins
$ anys plugins add models/gemini
$ anys plugins update

# System check
$ anys doctor

# Deploy actions
$ anys "deploy FLRbots to production"
$ anys "ssh into gambla server and check if bot is running"
```

---

## Voice Examples

```
You: "Hey Anys"
Anys: *chime*

You: "What's the status on Gamba Tycoons?"
Anys: "The bot is running. Last activity 2 hours ago.
       You have 3 pending tasks for sticker animations.
       Want me to list them?"

You: "Start working on the first one"
Anys: "Opening gifit and the sticker source files..."
```

---

## Self-Improvement

Anys observes how you use it and suggests improvements:

- "You ask about code a lot. DeepSeek Coder would give better responses."
- "I noticed you copy text then ask about it. Enable clipboard-monitor?"
- "Your M4 Max can run Llama 70B at higher precision. Upgrade?"
- "Whisper V3 Turbo just released - 3x faster. Switch?"

---

## Directory Structure

```
/Users/claude/Anys/
├── CLAUDE.md
├── ANYS_VISION.md          # This file
├── config/
│   ├── anys.yaml           # Master config
│   └── secrets.env         # API keys
│
├── core/                    # Minimal kernel
│   ├── index.ts
│   ├── plugin-manager.ts
│   ├── event-bus.ts
│   ├── capability-registry.ts
│   ├── router.ts
│   └── self-improvement.ts
│
├── plugins/                 # All capabilities
│   ├── models/
│   ├── actions/
│   ├── perceptions/
│   ├── memory/
│   └── interfaces/
│
├── brain/                   # Knowledge (human-readable)
│   ├── stack.md            # APIs, services, billing
│   ├── me.md               # Personal info
│   ├── projects.md         # Projects
│   ├── tasks.md            # Todo list
│   ├── people.md           # Network
│   └── calendar.md         # Events
│
├── data/                    # Runtime data
│   ├── chroma/
│   ├── conversations/
│   ├── metrics/
│   └── logs/
│
├── discord/                 # Discord bot
│   └── check-anys/
│
└── launchd/                 # macOS services
    └── com.anys.core.plist
```

---

## Implementation Phases

| Phase | Focus |
|-------|-------|
| **1** | Core kernel, CLI, Ollama integration |
| **2** | ChromaDB, conversation storage, semantic search |
| **3** | Whisper voice input, wake word, TTS |
| **4** | macOS automation, file ops, task management |
| **5** | File watching, clipboard, proactive alerts |
| **6** | Discord bridge, shared memory |
| **7** | Menubar app, polish, optimization |

---

## Current Stack (Reference)

| API | Project | Billing |
|-----|---------|---------|
| **Anthropic** | Anys Discord bot | console.anthropic.com |
| **Gemini** | gifit | Google Cloud |
| **Discord** | Anys, Factory bots | Free |
| **Supabase** | Anys, Factory | supabase.com |

SSH Servers:
- `159.89.143.102` (gambla_server)
- `38.60.200.225` (gambla_server_2)

---

*Created: 2024-12-29*
*Status: Vision document - implementation pending*
