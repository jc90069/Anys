// ═══════════════════════════════════════════════════════════════
// OLLAMA PLUGIN
// Local LLM via Ollama (Llama, DeepSeek, Mistral, etc.)
// Ready for M4 Max!
// ═══════════════════════════════════════════════════════════════

import {
  Plugin,
  PluginManifest,
  PluginContext,
  ModelProvider,
  ModelDefinition,
  CompletionOptions,
  CompletionResult,
} from '../../../core/types.js';

// Model mappings (Anys ID -> Ollama model name)
const DEFAULT_MODEL_MAP: Record<string, string> = {
  'ollama/llama-8b': 'llama3.1:8b',
  'ollama/llama-70b': 'llama3.1:70b',
  'ollama/deepseek-coder': 'deepseek-coder-v2:33b',
  'ollama/mistral': 'mistral:7b',
  'ollama/qwen': 'qwen2.5:72b',
  'ollama/phi': 'phi3:14b',
  // Aliases
  'llama-8b': 'llama3.1:8b',
  'llama-70b': 'llama3.1:70b',
  'deepseek-coder': 'deepseek-coder-v2:33b',
};

const MODEL_DEFINITIONS: ModelDefinition[] = [
  {
    id: 'ollama/llama-8b',
    type: 'text',
    context: 128000,
    capabilities: ['fast', 'local'],
    local: true,
  },
  {
    id: 'ollama/llama-70b',
    type: 'text',
    context: 128000,
    capabilities: ['reasoning', 'local'],
    local: true,
  },
  {
    id: 'ollama/deepseek-coder',
    type: 'code',
    context: 128000,
    capabilities: ['code', 'local'],
    local: true,
  },
  {
    id: 'ollama/mistral',
    type: 'text',
    context: 32000,
    capabilities: ['balanced', 'local'],
    local: true,
  },
];

interface OllamaResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaListResponse {
  models: Array<{
    name: string;
    size: number;
    digest: string;
  }>;
}

class OllamaModelProvider implements ModelProvider {
  name = 'ollama';
  private context: PluginContext | null = null;
  private host = 'http://localhost:11434';
  private availableModels: Set<string> = new Set();

  setContext(context: PluginContext): void {
    this.context = context;
  }

  setHost(host: string): void {
    this.host = host;
  }

  // Check if Ollama is running and get available models
  async refresh(): Promise<void> {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      if (response.ok) {
        const data = await response.json() as OllamaListResponse;
        this.availableModels = new Set(data.models.map(m => m.name));
        this.context?.log.info(`Found ${this.availableModels.size} Ollama models`);
      }
    } catch (error) {
      this.context?.log.warn('Ollama not available:', error);
      this.availableModels = new Set();
    }
  }

  async listModels(): Promise<ModelDefinition[]> {
    await this.refresh();
    return MODEL_DEFINITIONS.filter(m => {
      const ollamaName = DEFAULT_MODEL_MAP[m.id];
      return this.availableModels.has(ollamaName);
    });
  }

  async isAvailable(modelId: string): Promise<boolean> {
    // Check if Ollama is running
    try {
      const response = await fetch(`${this.host}/api/tags`);
      if (!response.ok) return false;

      const data = await response.json() as OllamaListResponse;
      this.availableModels = new Set(data.models.map(m => m.name));

      // Check if requested model is available
      const ollamaName = DEFAULT_MODEL_MAP[modelId] || DEFAULT_MODEL_MAP[modelId.replace('ollama/', '')];
      if (!ollamaName) return false;

      return this.availableModels.has(ollamaName);
    } catch {
      return false;
    }
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const startTime = Date.now();

    // Resolve model name
    const modelId = options.model;
    const ollamaModel = DEFAULT_MODEL_MAP[modelId] ||
      DEFAULT_MODEL_MAP[modelId.replace('ollama/', '')] ||
      modelId;

    // Build messages
    const messages = [];

    if (options.system) {
      messages.push({ role: 'system', content: options.system });
    }

    for (const msg of options.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    try {
      const response = await fetch(`${this.host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          messages,
          stream: false,
          options: {
            num_predict: options.max_tokens || 4096,
            temperature: options.temperature || 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as OllamaResponse;

      return {
        content: data.message.content,
        model: options.model,
        usage: {
          input_tokens: data.prompt_eval_count || 0,
          output_tokens: data.eval_count || 0,
        },
        latency_ms: Date.now() - startTime,
      };
    } catch (error) {
      this.context?.log.error('Ollama error:', error);
      throw error;
    }
  }

  async *stream(options: CompletionOptions): AsyncIterable<string> {
    const modelId = options.model;
    const ollamaModel = DEFAULT_MODEL_MAP[modelId] ||
      DEFAULT_MODEL_MAP[modelId.replace('ollama/', '')] ||
      modelId;

    const messages = [];

    if (options.system) {
      messages.push({ role: 'system', content: options.system });
    }

    for (const msg of options.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    const response = await fetch(`${this.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        messages,
        stream: true,
        options: {
          num_predict: options.max_tokens || 4096,
          temperature: options.temperature || 0.7,
        },
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line) as OllamaResponse;
          if (data.message?.content) {
            yield data.message.content;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}

class OllamaPlugin implements Plugin {
  manifest!: PluginManifest;
  modelProvider: OllamaModelProvider;

  constructor() {
    this.modelProvider = new OllamaModelProvider();
  }

  async onLoad(context: PluginContext): Promise<void> {
    context.log.info('Ollama plugin loaded');
    this.modelProvider.setContext(context);
  }

  async onEnable(context: PluginContext): Promise<void> {
    // Check if Ollama is available
    const isAvailable = await this.modelProvider.isAvailable('ollama/llama-8b');

    if (isAvailable) {
      await this.modelProvider.refresh();
      context.log.info('Ollama connected');
    } else {
      context.log.warn('Ollama not running - local models unavailable');
      context.log.info('Install Ollama: https://ollama.ai');
      context.log.info('Then run: ollama pull llama3.1:8b');
    }
  }

  async onDisable(context: PluginContext): Promise<void> {
    context.log.info('Ollama plugin disabled');
  }
}

export default OllamaPlugin;
