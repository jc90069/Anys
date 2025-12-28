# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Anys** is a Year 1 Domestic Agent - a personal AI assistant focused on voice-first automation, privacy, and eliminating administrative overhead. The system is designed with security-first principles: all voice processing runs locally using Whisper, and sensitive data never touches the cloud.

## Architecture

### Core Components

1. **Voice Input System** (`~/bin/anys`)
   - Bash script that records audio using `ffmpeg` with AVFoundation (device :1 = MacBook Pro Microphone)
   - Records for 6 seconds, transcribes locally with Whisper (base model)
   - Types transcribed text directly where cursor is using AppleScript
   - Command: `talk` (alias) or `~/bin/anys`
   - Status: Recording & transcription WORKING. Auto-typing blocked by Terminal accessibility permissions (user must grant in System Settings)
   - Hotkey (Control+@) via Automator workflow exists but unreliable - Terminal command is preferred method

2. **Configuration Management** (`config.json`)
   - Central configuration tracking features, security settings, and project status
   - Tracks feature enablement and blockers
   - Documents security posture (firewall, DNS, Touch ID sudo)
   - Maintains next session tasks

3. **Automation Workflow** (`~/Library/Services/Anys.workflow`)
   - macOS Quick Action/Service providing global hotkey access
   - Launches the main anys script

### File Structure

```
~/Anys/                          # Project root
├── config.json                  # Central configuration and state
├── README.md                    # Project documentation
├── CLAUDE.md                    # This file
└── folder/                      # Working directory for voice tests
    ├── .claude/                 # Claude Code permissions/settings
    │   └── settings.local.json  # Approved bash commands for security
    └── test_voice.*             # Voice transcription test outputs

~/bin/                           # User executables
├── anys                         # Main voice transcription script
├── anys-gui                     # GUI wrapper with notifications
├── gifit                        # Fast image-to-GIF animator (ImageMagick)
├── organize-downloads           # File type organizer (by extension)
├── smart-rename                 # AI-powered file renamer (adds descriptive prefixes)
├── flare-organize               # FLARE project auto-organizer
├── flare-organize-safe          # FLARE organizer with undo capability
└── flare-undo                   # Reverses flare-organize-safe

~/gifit/                         # GIF animation tool (see ~/gifit/CLAUDE.md)
├── gifit                        # Main CLI (unified)
├── veo_to_gif.js               # AI animation (Gemini API)
├── image_to_gif.py             # Fast ImageMagick animation
└── output/                      # Generated GIFs go here

~/Projects/                      # Active work projects
└── FLARE/                       # Main active project
    ├── 1 Branding/              # Logos, brand assets
    ├── 2 Clients/               # Client folders (UNREEL, LOADED, MAXX, etc.)
    ├── 3 Legal/                 # Contracts, agreements
    ├── 4-Design-Tests/          # Design experiments, tests
    ├── 5-Screenshots/           # Auto-collected screenshots
    ├── 6-Mockups/               # Design mockups, wireframes
    └── igaming/                 # iGaming-related assets

~/Library/Services/Anys.workflow # Hotkey trigger (Control+@) - unreliable
```

## Development Commands

### Voice Transcription

```bash
# Primary method - run in Terminal
talk                    # Alias for ~/bin/anys
~/bin/anys             # Records 6 sec, transcribes, types text

# List audio devices
ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep "AVFoundation"

# Test recording from correct mic
ffmpeg -f avfoundation -i ":1" -t 3 -ar 16000 -ac 1 /tmp/test.wav -y
```

### File Automation

```bash
# Organize Downloads by file type (dry-run first!)
organize-downloads --dry-run     # Preview changes
organize-downloads --execute     # Actually move files

# Smart rename with descriptive prefixes
smart-rename --dry-run --limit 20      # Preview 20 files
smart-rename --execute --limit 50      # Rename 50 files

# FLARE project organization
flare-organize --dry-run         # Preview FLARE file detection
flare-organize-safe              # Organize with undo capability
flare-undo                       # Reverse last organization
```

### GIF Animation (gifit)

```bash
# AI-powered animation (Gemini)
gifit veo photo.png                    # Default AI animation
gifit veo photo.png "gentle breathing" # Custom prompt
gifit veo photo.png -k 16              # 16 keyframes

# Fast ImageMagick animation
gifit image logo.png                   # Default pulse
gifit image logo.png -m wobble         # Rotation + sway
gifit image logo.png -m shake          # Quick shake
gifit image logo.png -m bounce         # Vertical bounce
gifit image logo.png -f 16             # 16 frames
gifit image logo.png --no-mask         # Animate whole image
```

**See**: `~/gifit/CLAUDE.md` for full documentation

### System Checks

```bash
# Verify security settings
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
networksetup -getdnsservers Wi-Fi
sudo -n true  # Check Touch ID sudo

# Check Downloads chaos level
find ~/Downloads -maxdepth 1 -type f | wc -l    # Count files
find ~/Downloads -maxdepth 1 -type d | wc -l    # Count folders
```

## Design Principles

1. **Local-First Privacy**: Voice processing (Whisper), file operations, and financial data must stay on the local machine. No cloud services for sensitive data.

2. **Security Hardening**: System runs with firewall + stealth mode, Quad9 DNS (9.9.9.9, 149.112.112.112), Touch ID for sudo, and removed remote access tools (TeamViewer).

3. **Voice-First Interface**: Primary interaction is through voice (⌥ Space hotkey), not typing. All commands should be speakable.

4. **Feature Modularity**: Features are defined in config.json with enabled/disabled state and status tracking (working/blocked/planned).

## Current Development Status

### Working ✅
- **Voice transcription**: Recording from MacBook Pro Microphone (ffmpeg device :1), Whisper transcription working perfectly
- **Security hardening**: Firewall, Quad9 DNS, Touch ID sudo complete
- **FLARE project structure**: Moved to ~/Projects/FLARE with organized subfolders
- **File automation tools**: organize-downloads, smart-rename, flare-organize created and tested

### Blocked/Issues ⚠️
- **Voice auto-typing**: Requires Terminal accessibility permissions (System Settings → Privacy & Security → Accessibility)
- **Hotkey trigger**: Control+@ workflow exists but unreliable - Terminal command `talk` preferred
- **FLARE auto-detection**: Too broad (grabbed non-FLARE files). Needs better detection rules based on specific keywords/patterns

### In Progress 🚧
- **File automation**: Active work on organizing 2,400+ files in Downloads
- **FLARE organization**: Need user input on how to identify FLARE-specific files (keywords, patterns, or manual)

### Planned Features 📋
- Task management (quick capture, reminders, daily review)
- Financial tracking (CSV aggregator, balance tracker) - pending security model definition
- Expand project organization to other active projects (Dusky, Influnity, etc.)

## Key Files to Understand

- `~/bin/anys`: Voice-to-text script using ffmpeg (AVFoundation device :1) → Whisper → osascript typing
- `~/bin/flare-organize-safe`: FLARE auto-organizer with backup/undo capability
- `config.json`: Source of truth for feature status and system configuration
- `folder/.claude/settings.local.json`: Approved bash commands for Claude Code's permission system
- `~/.flare-organize-backup.log`: Backup log for undo operations (created by flare-organize-safe)

## Important Learnings

### Voice System
- **Mic issue**: Microsoft Teams Audio (device :0) was default, wrong device. Fixed by explicitly using ffmpeg device :1 (MacBook Pro Microphone)
- **Bash compatibility**: macOS bash is old (doesn't support associative arrays `declare -A` or `${var,,}`). Use case statements and `tr` instead
- **Hotkeys unreliable**: macOS Services/Automator workflows are flaky. Terminal commands more reliable for power users

### File Automation
- **2,400+ files in Downloads**: 159 folders, massive organizational chaos
- **Auto-detection is hard**: Generic patterns (all logos, all screenshots) grab too many files from different projects
- **User needs project-based organization**: Not file-type organization. Files belong to projects (FLARE, Dusky, Influnity, etc.)
- **Always create undo**: User wants safety net. Implement backup logs and undo commands for destructive operations

### Project Organization
- **FLARE is #1 priority**: Focus on active project first, expand later
- **Downloads chaos**: 159 folders including work projects (Dusky, Influnity, banana studios), legal docs, personal files all mixed together
- **User prefers**: Manual file organization over aggressive AI detection, at least until detection rules are refined

## Security Model

When implementing new features:
- Keep sensitive data processing local
- Respect the permission whitelist in `.claude/settings.local.json`
- Verify any new bash commands are security-reviewed before adding
- Financial features require explicit security model design before implementation
- Always implement undo/backup for file operations

## Audit Findings (2025-12-25)

Full codebase audit completed. Summary of issues by priority:

### Critical - Fix First
1. **Command injection in `anys` line 27**: Unescaped `$TEXT` in AppleScript keystroke command. If Whisper transcribes quotes/special chars, could break script or inject commands. Need to escape text before passing to osascript.

### Important - Fix Soon
2. **No version control**: Project not in git. Need to init repo + add `.gitignore` for `.DS_Store`, `*.wav`, `/tmp/*`
3. **Fragile Whisper pipeline**: Line 16 uses `&&` - if whisper fails, `cat` runs on nonexistent file
4. **Hidden errors**: All scripts use `2>/dev/null` everywhere. Should log to `~/.anys/logs/` instead
5. **Predictable temp file**: `/tmp/anys_voice.wav` is world-readable. Use `mktemp` instead

### Minor - Improve Over Time
6. Add `set -eu` to all script headers (exit on error, undefined vars)
7. Consolidate shared functions (notifications, file loops) into `lib/common.sh`
8. Remove `anys.backup` from ~/bin/ (use git branches instead)
9. Fix config.json hotkey discrepancy (says "⌥ Space" but workflow uses Control+@)
10. Clean up test files from `folder/`

### Recommended Structure
```
~/Anys/
├── scripts/
│   ├── lib/common.sh          # Shared functions
│   ├── voice/anys             # Main script
│   └── files/                 # File automation
└── ~/bin/                     # Symlinks only
```

### Next Session Tasks
- [ ] Fix AppleScript escaping in `anys` (critical security fix)
- [ ] Init git repo with proper `.gitignore`
- [ ] Add `set -eu` to all scripts
- [ ] Replace `2>/dev/null` with logging
- [ ] Consider reverting to SoX silence detection (better UX than fixed 6 sec)
- [x] ~~Fix gifit tool~~ (DONE - consolidated 2024-12-27)

---

## Gifit Tool - Image Animation

**Status**: WORKING (consolidated 2024-12-27)

**Location**: `~/gifit/` - See `~/gifit/CLAUDE.md` for full documentation

### Two Approaches

1. **`gifit veo`** - AI animation using Gemini API (creative, slower)
2. **`gifit image`** - ImageMagick transforms (fast, mechanical effects)

### Quick Reference

```bash
gifit veo photo.png "subtle breathing"   # AI animation
gifit image logo.png -m pulse            # Fast local animation
```

### ComfyUI (Blocked)

Still installed at `~/ComfyUI/` but blocked due to Intel Mac + PyTorch 2.2.2 limitation.
Not needed now that Gemini API works for AI animation.
