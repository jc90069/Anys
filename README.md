# Anys

**Year 1 Domestic Agent**

Your personal AI assistant for automation, voice control, and eliminating admin bullshit from your life.

## Philosophy

- Voice-first (talk, don't type)
- Local & private (Whisper runs on your machine)
- Automate the boring stuff
- One agent, unified control

## Current Status

### Working
- [x] Security hardening (firewall, DNS, Touch ID sudo)
- [x] Hotkey configured (⌥ Space)
- [x] Whisper installed (local voice transcription)
- [x] Project structure

### Blocked
- [ ] Voice input (mic recording from wrong device - needs fix)

### Planned
- [ ] File automation (Downloads/Desktop organizer, backups)
- [ ] Task management (quick capture, reminders)
- [ ] Financial tracking (after security model defined)

## Commands

```bash
anys                    # Voice command (once mic fixed)
~/bin/anys              # Direct path
```

## Structure

```
~/Anys/
├── config.json         # Settings & state
├── README.md           # This file
└── (future modules)

~/bin/
└── anys                # Main voice script

~/Library/Services/
└── Anys.workflow       # Hotkey trigger (⌥ Space)
```

## Security Posture

| Layer | Status |
|-------|--------|
| Firewall | ON + Stealth |
| DNS | Quad9 (malware blocking) |
| Sudo | Touch ID required |
| Voice processing | 100% local (Whisper) |
| Removed | TeamViewer |

## Next Session

1. Fix mic input device issue
2. Build Downloads folder auto-organizer
3. Set up quick task capture
4. Design financial tracking security model

## Design Principles

1. **No cloud for sensitive data** - voice, files, finances stay local
2. **Automate ruthlessly** - if you do it twice, script it
3. **Reduce friction** - fewer clicks, fewer decisions
4. **Stay secure** - paranoid by default

---

*Born: 2025-12-22*
*Year 1 of domestic agents*
