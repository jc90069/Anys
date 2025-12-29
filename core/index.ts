// ═══════════════════════════════════════════════════════════════
// ANYS CORE
// Local AI Operating System
// ═══════════════════════════════════════════════════════════════

import { loadConfig, ensureConfig } from './config.js';
import { PluginManager } from './plugin-manager.js';
import { eventBus, Events } from './event-bus.js';
import { AnysConfig, CompletionResult, Message } from './types.js';

export class Anys {
  private config: AnysConfig;
  private pluginManager: PluginManager;
  private ready = false;

  constructor() {
    this.config = ensureConfig();
    this.pluginManager = new PluginManager(this.config, './plugins');
  }

  // Initialize the system
  async init(): Promise<void> {
    console.log('\n✨ Anys starting...\n');

    // Log hardware info
    console.log(`   Hardware: ${this.config.hardware.chip}`);
    console.log(`   Memory: ${this.config.hardware.memory_gb}GB`);
    console.log(`   Router: ${this.config.intelligence.router.strategy}`);
    console.log('');

    // Load plugins
    console.log('📦 Loading plugins...');
    await this.pluginManager.loadEnabledPlugins();

    const plugins = this.pluginManager.getAllPlugins();
    for (const [name] of plugins) {
      console.log(`   ✓ ${name}`);
    }
    console.log('');

    this.ready = true;
    eventBus.emit(Events.SYSTEM_READY, 'core', { config: this.config });
    console.log('🎧 Anys ready.\n');
  }

  // Send a message and get a response
  async chat(message: string, options?: {
    history?: Message[];
    model?: string;
  }): Promise<CompletionResult> {
    if (!this.ready) {
      throw new Error('Anys not initialized. Call init() first.');
    }

    const messages: Message[] = [
      ...(options?.history || []),
      { role: 'user', content: message },
    ];

    // Build system prompt with memory context
    const systemPrompt = await this.buildSystemPrompt(message);

    const result = await this.pluginManager.complete({
      model: options?.model,
      messages,
      system: systemPrompt,
      max_tokens: 4096,
    });

    eventBus.emit(Events.MESSAGE_RESPONSE, 'core', {
      input: message,
      output: result.content,
      model: result.model,
    });

    return result;
  }

  // Build system prompt from brain files and memory
  private async buildSystemPrompt(userMessage: string): Promise<string> {
    const basePrompt = `You are Anys, a personal AI assistant running locally on the user's Mac.

Personality:
- Helpful, concise, and professional
- Direct answers without fluff
- Match the user's energy
- No emojis unless the user uses them first

You have access to the user's memories and knowledge. Use this context to personalize responses.`;

    // Search for relevant memories based on the user's message
    let memoryContext = '';
    try {
      const memories = await this.pluginManager.searchMemory(userMessage, { limit: 5 });
      if (memories.length > 0) {
        memoryContext = '\n\n[YOUR MEMORIES ABOUT THIS USER]\n';
        for (const mem of memories) {
          memoryContext += `- [${mem.type}] ${mem.content}\n`;
        }
      }
    } catch {
      // Memory search failed, continue without
    }

    // TODO: Also load brain files (stack.md, me.md, projects.md)

    return basePrompt + memoryContext;
  }

  // Get config
  getConfig(): AnysConfig {
    return this.config;
  }

  // Get plugin manager
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  // Shutdown
  async shutdown(): Promise<void> {
    console.log('\n👋 Anys shutting down...');
    eventBus.emit(Events.SYSTEM_SHUTDOWN, 'core', {});

    // Disable all plugins
    const plugins = this.pluginManager.getAllPlugins();
    for (const [name] of plugins) {
      await this.pluginManager.disablePlugin(name);
    }

    this.ready = false;
    console.log('   Goodbye!\n');
  }
}

// Export for CLI and other entry points
export { loadConfig, ensureConfig } from './config.js';
export { PluginManager } from './plugin-manager.js';
export { eventBus, Events } from './event-bus.js';
export * from './types.js';

// Default export
export default Anys;
