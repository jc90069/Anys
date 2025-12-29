// ═══════════════════════════════════════════════════════════════
// CLI INTERFACE PLUGIN
// Command-line interface for Anys
// ═══════════════════════════════════════════════════════════════

import * as readline from 'readline';

// Inline types
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface CompletionResult {
  content: string;
  model: string;
  usage?: { input_tokens: number; output_tokens: number };
  latency_ms?: number;
}

interface Logger {
  debug: (msg: string, ...args: unknown[]) => void;
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

interface PluginContext {
  config: unknown;
  log: Logger;
  emit: (event: string, data?: unknown) => void;
  on: (event: string, handler: (data: unknown) => void) => void;
  complete: (options: { messages: Message[]; model?: string }) => Promise<CompletionResult>;
}

interface PluginManifest {
  name: string;
  version: string;
  description: string;
  category: string;
  provides: unknown;
}

interface InterfaceProvider {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  handleMessage?(message: string): Promise<string>;
}

interface Plugin {
  manifest: PluginManifest;
  onLoad?(context: PluginContext): Promise<void>;
  onEnable?(context: PluginContext): Promise<void>;
  onDisable?(context: PluginContext): Promise<void>;
  interfaceProvider?: InterfaceProvider;
}

class CliInterfaceProvider implements InterfaceProvider {
  name = 'cli';
  private context: PluginContext | null = null;
  private rl: readline.Interface | null = null;
  private running = false;
  private history: Message[] = [];

  setContext(context: PluginContext): void {
    this.context = context;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.context?.log.info('CLI interface started');
  }

  async stop(): Promise<void> {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    this.running = false;
    this.context?.log.info('CLI interface stopped');
  }

  // Handle a single message (used by anys CLI command)
  async handleMessage(message: string): Promise<string> {
    if (!this.context) {
      throw new Error('CLI not initialized');
    }

    // Add user message to history
    this.history.push({ role: 'user', content: message });

    // Get response
    const result = await this.context.complete({
      messages: this.history,
    });

    // Add assistant response to history
    this.history.push({ role: 'assistant', content: result.content });

    return result.content;
  }

  // Interactive REPL mode
  async startRepl(): Promise<void> {
    if (!this.context) {
      throw new Error('CLI not initialized');
    }

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n🧠 Anys CLI - Type your message (or "exit" to quit)\n');

    const prompt = (): void => {
      this.rl?.question('You: ', async (input) => {
        const trimmed = input.trim();

        if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
          console.log('\n👋 Goodbye!\n');
          this.rl?.close();
          return;
        }

        if (!trimmed) {
          prompt();
          return;
        }

        try {
          const response = await this.handleMessage(trimmed);
          console.log(`\nAnys: ${response}\n`);
        } catch (error) {
          console.error('\n❌ Error:', error instanceof Error ? error.message : error, '\n');
        }

        prompt();
      });
    };

    prompt();
  }

  // Clear conversation history
  clearHistory(): void {
    this.history = [];
  }
}

class CliPlugin implements Plugin {
  manifest!: PluginManifest;
  interfaceProvider: CliInterfaceProvider;

  constructor() {
    this.interfaceProvider = new CliInterfaceProvider();
  }

  async onLoad(context: PluginContext): Promise<void> {
    context.log.info('CLI plugin loaded');
    this.interfaceProvider.setContext(context);
  }

  async onEnable(context: PluginContext): Promise<void> {
    await this.interfaceProvider.start();
  }

  async onDisable(context: PluginContext): Promise<void> {
    await this.interfaceProvider.stop();
  }
}

export default CliPlugin;
