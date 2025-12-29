#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════════════════════
// ANYS CLI
// Command-line interface for Anys
// ═══════════════════════════════════════════════════════════════

import { Command } from 'commander';
import Anys from '../core/index.js';
import { loadConfig } from '../core/config.js';

const program = new Command();

program
  .name('anys')
  .description('Anys - Local AI Operating System')
  .version('1.0.0');

// Main chat command (default)
program
  .argument('[message...]', 'Message to send to Anys')
  .option('-m, --model <model>', 'Model to use (haiku, sonnet, opus)')
  .option('-r, --repl', 'Start interactive REPL mode')
  .action(async (messageParts: string[], options: { model?: string; repl?: boolean }) => {
    const anys = new Anys();

    try {
      await anys.init();

      // REPL mode
      if (options.repl || messageParts.length === 0) {
        const cliPlugin = anys.getPluginManager().getPlugin('interfaces/cli');
        if (cliPlugin?.interfaceProvider && 'startRepl' in cliPlugin.interfaceProvider) {
          await (cliPlugin.interfaceProvider as { startRepl: () => Promise<void> }).startRepl();
        } else {
          console.error('CLI interface not available');
          process.exit(1);
        }
        return;
      }

      // Single message mode
      const message = messageParts.join(' ');

      // Determine model
      let model: string | undefined;
      if (options.model) {
        model = `claude-api/${options.model}`;
      }

      const result = await anys.chat(message, { model });

      console.log(result.content);

      // Show usage info
      if (result.usage) {
        console.log(`\n[${result.model} | ${result.usage.input_tokens}→${result.usage.output_tokens} tokens | ${result.latency_ms}ms]`);
      }

      await anys.shutdown();
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Show or modify configuration')
  .option('-s, --show', 'Show current configuration')
  .action((options: { show?: boolean }) => {
    const config = loadConfig();
    console.log(JSON.stringify(config, null, 2));
  });

// Plugins command
program
  .command('plugins')
  .description('List plugins')
  .action(async () => {
    const anys = new Anys();
    await anys.init();

    const plugins = anys.getPluginManager().getAllPlugins();

    console.log('\nInstalled Plugins:');
    console.log('─'.repeat(40));

    for (const [name, plugin] of plugins) {
      console.log(`  ✓ ${name} (v${plugin.manifest.version})`);
      console.log(`    ${plugin.manifest.description}`);
    }

    console.log('');
    await anys.shutdown();
  });

// Doctor command
program
  .command('doctor')
  .description('Check system status')
  .action(async () => {
    const config = loadConfig();

    console.log('\n🩺 Anys Doctor\n');
    console.log('Hardware:');
    console.log(`  Chip: ${config.hardware.chip}`);
    console.log(`  Memory: ${config.hardware.memory_gb}GB`);
    console.log(`  Detected: ${config.hardware.detected ? 'Yes' : 'Manual'}`);

    console.log('\nAPI Keys:');
    console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Missing'}`);
    console.log(`  GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✓ Set' : '○ Not set'}`);
    console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓ Set' : '○ Not set'}`);

    console.log('\nIntelligence:');
    console.log(`  Strategy: ${config.intelligence.router.strategy}`);
    console.log(`  Primary: ${config.intelligence.assignments.primary}`);
    console.log(`  Fast: ${config.intelligence.assignments.fast}`);
    console.log(`  Complex: ${config.intelligence.assignments.complex}`);

    console.log('\nPlugins Enabled:');
    for (const plugin of config.plugins.enabled) {
      console.log(`  - ${plugin}`);
    }

    console.log('');
  });

// Memory command
program
  .command('memory')
  .description('Memory operations')
  .option('-s, --search <query>', 'Search memories (semantic)')
  .option('-l, --list', 'List recent memories')
  .option('-a, --add <content>', 'Add a memory')
  .option('-t, --type <type>', 'Memory type (fact, preference, decision, event)', 'fact')
  .option('-i, --importance <n>', 'Importance 1-10', '5')
  .action(async (options: { search?: string; list?: boolean; add?: string; type?: string; importance?: string }) => {
    const anys = new Anys();
    await anys.init();

    const pm = anys.getPluginManager();

    if (options.add) {
      const id = await pm.storeMemory({
        type: options.type as 'fact' | 'preference' | 'decision' | 'event',
        content: options.add,
        importance: parseInt(options.importance || '5'),
        timestamp: new Date(),
      });
      console.log(`\n✓ Memory stored: ${id}\n`);
    } else if (options.search) {
      const results = await pm.searchMemory(options.search, { limit: 10 });
      console.log(`\nFound ${results.length} memories:\n`);
      for (const entry of results) {
        console.log(`[${entry.type}] ${entry.content}`);
        if (entry.timestamp) {
          console.log(`  ${new Date(entry.timestamp).toLocaleString()}`);
        }
        console.log('');
      }
    } else if (options.list) {
      const results = await pm.searchMemory('', { limit: 20 });
      console.log(`\nRecent ${results.length} memories:\n`);
      for (const entry of results) {
        console.log(`[${entry.type}] ${entry.content.substring(0, 60)}${entry.content.length > 60 ? '...' : ''}`);
      }
    } else {
      console.log('\nUsage:');
      console.log('  anys memory --add "User prefers dark mode" --type preference');
      console.log('  anys memory --search "dark mode"');
      console.log('  anys memory --list');
    }

    await anys.shutdown();
  });

program.parse();
