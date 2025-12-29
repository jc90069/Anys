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

    // Build system prompt from brain files
    const systemPrompt = await this.buildSystemPrompt();

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

  // Build system prompt from brain files
  private async buildSystemPrompt(): Promise<string> {
    const basePrompt = `You are Anys, a personal AI assistant.

Personality:
- Helpful, concise, and professional
- Direct answers without fluff
- Match the user's energy
- No emojis unless the user uses them first

You have access to the user's knowledge base and can remember past conversations.`;

    // TODO: Load and append brain files content
    // const brainContent = await this.loadBrainFiles();

    return basePrompt;
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
