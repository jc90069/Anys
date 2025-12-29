// ═══════════════════════════════════════════════════════════════
// CLAUDE API PLUGIN
// Anthropic Claude models (Haiku, Sonnet, Opus)
// ═══════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import {
  Plugin,
  PluginManifest,
  PluginContext,
  ModelProvider,
  ModelDefinition,
  CompletionOptions,
  CompletionResult,
} from '../../../core/types.js';

// Model mappings
const MODELS: Record<string, string> = {
  'claude-api/haiku': 'claude-3-haiku-20240307',
  'claude-api/sonnet': 'claude-sonnet-4-20250514',
  'claude-api/opus': 'claude-opus-4-20250514',
  // Aliases
  'haiku': 'claude-3-haiku-20240307',
  'sonnet': 'claude-sonnet-4-20250514',
  'opus': 'claude-opus-4-20250514',
};

const MODEL_DEFINITIONS: ModelDefinition[] = [
  {
    id: 'claude-api/haiku',
    type: 'text',
    context: 200000,
    capabilities: ['fast', 'classification'],
    local: false,
  },
  {
    id: 'claude-api/sonnet',
    type: 'text',
    context: 200000,
    capabilities: ['balanced', 'code', 'reasoning'],
    local: false,
  },
  {
    id: 'claude-api/opus',
    type: 'text',
    context: 200000,
    capabilities: ['complex', 'deep-reasoning', 'creative'],
    local: false,
  },
];

class ClaudeModelProvider implements ModelProvider {
  name = 'claude-api';
  private client: Anthropic | null = null;
  private context: PluginContext | null = null;

  setContext(context: PluginContext): void {
    this.context = context;
  }

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not set');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  async listModels(): Promise<ModelDefinition[]> {
    return MODEL_DEFINITIONS;
  }

  async isAvailable(modelId: string): Promise<boolean> {
    // Check if we have a mapping for this model
    const hasMapping = modelId in MODELS ||
      modelId.replace('claude-api/', '') in MODELS;

    // Check if API key is set
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

    return hasMapping && hasApiKey;
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const startTime = Date.now();
    const client = this.getClient();

    // Resolve model ID
    let modelId = options.model;
    if (modelId in MODELS) {
      modelId = MODELS[modelId];
    } else if (modelId.replace('claude-api/', '') in MODELS) {
      modelId = MODELS[modelId.replace('claude-api/', '')];
    }

    // Convert messages format
    const messages = options.messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    try {
      const response = await client.messages.create({
        model: modelId,
        max_tokens: options.max_tokens || 4096,
        system: options.system,
        messages,
      });

      const content = response.content[0];
      const text = content.type === 'text' ? content.text : '';

      return {
        content: text,
        model: options.model,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
        latency_ms: Date.now() - startTime,
      };
    } catch (error) {
      this.context?.log.error('Claude API error:', error);
      throw error;
    }
  }

  async *stream(options: CompletionOptions): AsyncIterable<string> {
    const client = this.getClient();

    // Resolve model ID
    let modelId = options.model;
    if (modelId in MODELS) {
      modelId = MODELS[modelId];
    }

    const messages = options.messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const stream = client.messages.stream({
      model: modelId,
      max_tokens: options.max_tokens || 4096,
      system: options.system,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          yield delta.text;
        }
      }
    }
  }
}

// Plugin class
class ClaudeApiPlugin implements Plugin {
  manifest!: PluginManifest;
  modelProvider: ClaudeModelProvider;

  constructor() {
    this.modelProvider = new ClaudeModelProvider();
  }

  async onLoad(context: PluginContext): Promise<void> {
    context.log.info('Claude API plugin loaded');
    this.modelProvider.setContext(context);
  }

  async onEnable(context: PluginContext): Promise<void> {
    // Verify API key
    if (!process.env.ANTHROPIC_API_KEY) {
      context.log.warn('ANTHROPIC_API_KEY not set - Claude API will not work');
    } else {
      context.log.info('Claude API ready');
    }
  }

  async onDisable(context: PluginContext): Promise<void> {
    context.log.info('Claude API plugin disabled');
  }
}

export default ClaudeApiPlugin;
