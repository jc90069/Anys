Review this Node.js Discord bot project created using AI assistance. Perform a comprehensive audit covering structure, organization, and code quality. Create an actionable improvement plan.

## Phase 1: Project Structure Audit

Analyze the current file/folder organization:

- Map out the existing structure
- Identify misplaced files (config in root, utilities scattered, etc.)
- Check for standard Node.js conventions:
  - `src/` for source code
  - `commands/` for bot commands
  - `events/` for Discord event handlers
  - `utils/` or `lib/` for shared utilities
  - `services/` for external integrations (including Supabase)
  - `config/` for configuration
  - `db/` or `database/` for database-related code
- Flag any generated/build files mixed with source
- Check for proper `.gitignore` (node_modules, .env, logs, etc.)

## Phase 2: Configuration & Security Audit

Review configuration management:

- Bot token handling (must be in .env, never committed)
- Environment variables vs hardcoded values
- Sensitive data exposure (API keys, webhooks, database credentials)
- Check for `.env.example` template
- Verify `package.json` has appropriate scripts, engines field
- Dependencies vs devDependencies properly separated
- Look for outdated or vulnerable dependencies

## Phase 3: Supabase Best Practices

Audit Supabase integration:

**Client Management**
- Single Supabase client instance (singleton pattern)
- Not creating new clients per request/command
- Client initialization in dedicated module (e.g., `services/supabase.js`)

**Security**
- `SUPABASE_URL` and keys in environment variables
- Service role key ONLY used server-side, never exposed
- Appropriate use of anon key vs service role key
- Row Level Security (RLS) policies enabled on tables
- Not bypassing RLS unnecessarily with service role

**Query Patterns**
- Consistent error handling on all queries (checking `error` response)
- Not ignoring Supabase errors silently
- Proper use of `.select()`, `.insert()`, `.update()`, `.delete()`
- Using `.single()` when expecting one row
- Avoiding `SELECT *` when specific columns suffice

**Data Layer Organization**
- Database queries abstracted into repository/service layer
- Not mixing Supabase queries directly in command handlers
- Reusable query functions (e.g., `getUserById()`, `saveGuildSettings()`)
- Consistent patterns for CRUD operations

**Real-time & Subscriptions**
- Proper cleanup of subscriptions on shutdown
- Not creating duplicate subscriptions
- Error handling on subscription channels

**Storage (if used)**
- Bucket organization
- File naming conventions
- Proper access policies

## Phase 4: Discord.js Best Practices

Audit Discord-specific patterns:

- Command handler architecture (not monolithic switch/if chains)
- Event handler organization (separate files per event)
- Proper gateway intents (only what's needed)
- Graceful shutdown handling (client.destroy() AND Supabase cleanup)
- Rate limiting awareness
- Permission checking before actions
- Slash command registration approach
- Interaction handlers (buttons, modals, select menus) organization
- Embed construction patterns
- Error responses to users (not silent failures)

## Phase 5: Code Quality Audit

Review for general best practices:

**DRY (Don't Repeat Yourself)**
- Identify duplicated code blocks
- Find copy-pasted logic that should be utilities
- Spot repeated string literals (use constants)
- Check for duplicated validation logic
- Repeated Supabase query patterns that could be abstracted

**Single Responsibility**
- Functions doing multiple unrelated things
- Giant functions that should be split
- Commands handling too many concerns
- Mixed business logic and Discord API calls
- Database logic mixed into command handlers

**Encapsulation & Organization**
- Related functionality grouped together
- Clear module boundaries
- Appropriate use of classes vs functions
- Consistent export patterns
- Data access layer separated from bot logic

**Error Handling**
- Unhandled promise rejections
- Missing try/catch in async functions
- Silent failures (especially Supabase errors)
- Proper error logging
- User-facing error messages
- Supabase query errors surfaced appropriately

**Naming & Readability**
- Consistent naming conventions (camelCase for variables/functions)
- Descriptive names (not `x`, `data`, `stuff`)
- Magic numbers/strings that need constants
- Comments explaining "why" not "what"

## Phase 6: Node.js Specifics

Check Node.js conventions:

- ES Modules vs CommonJS consistency
- Async/await vs callbacks vs .then() consistency
- Proper use of `path.join()` for file paths
- Process event handlers (uncaughtException, unhandledRejection)
- Logging approach (console.log vs proper logger)
- Package-lock.json committed
- Graceful shutdown (SIGTERM, SIGINT handlers)

## Deliverables

1. **Current State Summary**: Overview of what exists and major issues
2. **Priority Issues**: Security/functionality problems to fix immediately
3. **Recommended Structure**: Proposed folder/file organization
4. **Refactoring Plan**: Ordered list of improvements with rationale
5. **Quick Wins**: Simple changes with high impact

Present findings organized by severity:
- 🔴 Critical (security, broken functionality)
- 🟠 Important (maintainability, best practices)
- 🟡 Minor (style, optimization)

## Recommended Project Structure

Propose reorganization following this pattern:

project-root/
├── src/
│   ├── commands/           # Slash commands
│   │   ├── moderation/
│   │   ├── utility/
│   │   └── fun/
│   ├── events/             # Discord event handlers
│   ├── handlers/           # Command/event loaders
│   ├── services/           # External services
│   │   ├── supabase.js     # Supabase client singleton
│   │   └── ...
│   ├── repositories/       # Database query abstractions
│   │   ├── userRepository.js
│   │   └── guildRepository.js
│   ├── utils/              # Shared utilities
│   └── config/             # Configuration
├── .env.example
├── .gitignore
├── package.json
└── index.js                # Entry point
