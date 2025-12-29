// ═══════════════════════════════════════════════════════════════
// ANYS CORE TYPES
// ═══════════════════════════════════════════════════════════════

export interface AnysConfig {
  version: string;
  hardware: HardwareConfig;
  intelligence: IntelligenceConfig;
  memory: MemoryConfig;
  voice: VoiceConfig;
  plugins: PluginsConfig;
  self_improvement: SelfImprovementConfig;
}

export interface HardwareConfig {
  chip: string;
  memory_gb: number;
  detected?: boolean;
}

export interface IntelligenceConfig {
  router: {
    strategy: 'auto' | 'local-first' | 'cloud-first' | 'cost-optimized';
    fallback: boolean;
  };
  assignments: {
    primary: string;
    fast: string;
    code: string;
    complex: string;
    vision?: string;
    voice_stt?: string;
    embeddings?: string;
  };
  thresholds: {
    complexity_for_cloud: number;
    max_local_latency_ms: number;
  };
}

export interface MemoryConfig {
  primary: string;
  path?: string;
  retention: {
    conversations: number;
    episodic: string;
  };
}

export interface VoiceConfig {
  wake_word: string;
  wake_word_sensitivity: number;
  stt: string;
  tts: string;
}

export interface PluginsConfig {
  enabled: string[];
  disabled: string[];
  auto_update: boolean;
  sources: string[];
}

export interface SelfImprovementConfig {
  enabled: boolean;
  can_suggest: string[];
  auto_apply: string[];
  requires_approval: string[];
}

// ═══════════════════════════════════════════════════════════════
// PLUGIN TYPES
// ═══════════════════════════════════════════════════════════════

export type PluginCategory = 'models' | 'actions' | 'perceptions' | 'memory' | 'interfaces';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  category: PluginCategory;
  provides: PluginProvides;
  requires?: PluginRequires;
  config?: Record<string, PluginConfigField>;
  hooks?: PluginHooks;
  author?: string;
  repository?: string;
  tags?: string[];
}

export interface PluginProvides {
  models?: ModelDefinition[];
  actions?: ActionDefinition[];
  perceptions?: PerceptionDefinition[];
  memory?: MemoryDefinition[];
  interfaces?: InterfaceDefinition[];
}

export interface PluginRequires {
  env?: string[];
  plugins?: string[];
}

export interface PluginConfigField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  default?: unknown;
  env?: string;
  description?: string;
  options?: unknown[];
}

export interface PluginHooks {
  on_install?: string;
  on_enable?: string;
  on_disable?: string;
  on_health_check?: string;
}

// ═══════════════════════════════════════════════════════════════
// MODEL TYPES
// ═══════════════════════════════════════════════════════════════

export interface ModelDefinition {
  id: string;
  type: 'text' | 'code' | 'multimodal' | 'embedding' | 'transcription';
  context?: number;
  capabilities?: string[];
  local?: boolean;
}

export interface ModelProvider {
  name: string;

  // List available models
  listModels(): Promise<ModelDefinition[]>;

  // Check if a model is available
  isAvailable(modelId: string): Promise<boolean>;

  // Generate completion
  complete(options: CompletionOptions): Promise<CompletionResult>;

  // Stream completion
  stream?(options: CompletionOptions): AsyncIterable<string>;
}

export interface CompletionOptions {
  model: string;
  messages: Message[];
  system?: string;
  max_tokens?: number;
  temperature?: number;
  stop?: string[];
}

export interface CompletionResult {
  content: string;
  model: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  latency_ms?: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ═══════════════════════════════════════════════════════════════
// ACTION TYPES
// ═══════════════════════════════════════════════════════════════

export interface ActionDefinition {
  id: string;
  description: string;
  parameters?: Record<string, ActionParameter>;
}

export interface ActionParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  default?: unknown;
  description?: string;
}

export interface ActionProvider {
  name: string;

  // List available actions
  listActions(): ActionDefinition[];

  // Execute an action
  execute(actionId: string, params: Record<string, unknown>): Promise<ActionResult>;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// PERCEPTION TYPES
// ═══════════════════════════════════════════════════════════════

export interface PerceptionDefinition {
  id: string;
  description: string;
  events: string[];
}

export interface PerceptionProvider {
  name: string;

  // Start perceiving
  start(): Promise<void>;

  // Stop perceiving
  stop(): Promise<void>;

  // Check if running
  isRunning(): boolean;
}

// ═══════════════════════════════════════════════════════════════
// MEMORY TYPES
// ═══════════════════════════════════════════════════════════════

export interface MemoryDefinition {
  id: string;
  description: string;
  capabilities: string[];
}

export interface MemoryProvider {
  name: string;

  // Store a memory
  store(entry: MemoryEntry): Promise<string>;

  // Search memories
  search(query: string, options?: SearchOptions): Promise<MemoryEntry[]>;

  // Get by ID
  get(id: string): Promise<MemoryEntry | null>;

  // Delete
  delete(id: string): Promise<boolean>;
}

export interface MemoryEntry {
  id?: string;
  type: 'fact' | 'preference' | 'decision' | 'conversation' | 'event';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
  importance?: number;
  embedding?: number[];
}

export interface SearchOptions {
  limit?: number;
  type?: string;
  min_importance?: number;
  since?: Date;
}

// ═══════════════════════════════════════════════════════════════
// INTERFACE TYPES
// ═══════════════════════════════════════════════════════════════

export interface InterfaceDefinition {
  id: string;
  description: string;
  type: 'cli' | 'voice' | 'api' | 'gui';
}

export interface InterfaceProvider {
  name: string;

  // Start the interface
  start(): Promise<void>;

  // Stop the interface
  stop(): Promise<void>;

  // Handle a message from user
  handleMessage?(message: string): Promise<string>;
}

// ═══════════════════════════════════════════════════════════════
// PLUGIN INSTANCE
// ═══════════════════════════════════════════════════════════════

export interface Plugin {
  manifest: PluginManifest;

  // Lifecycle
  onLoad?(context: PluginContext): Promise<void>;
  onEnable?(context: PluginContext): Promise<void>;
  onDisable?(context: PluginContext): Promise<void>;

  // Providers (implement based on category)
  modelProvider?: ModelProvider;
  actionProvider?: ActionProvider;
  perceptionProvider?: PerceptionProvider;
  memoryProvider?: MemoryProvider;
  interfaceProvider?: InterfaceProvider;
}

export interface PluginContext {
  config: AnysConfig;
  emit: (event: string, data?: unknown) => void;
  on: (event: string, handler: (data: unknown) => void) => void;
  log: Logger;
  getPlugin: (name: string) => Plugin | undefined;
  complete: (options: Omit<CompletionOptions, 'model'> & { model?: string }) => Promise<CompletionResult>;
  runAction: (actionId: string, params: Record<string, unknown>) => Promise<ActionResult>;
  storeMemory: (entry: Omit<MemoryEntry, 'id'>) => Promise<string>;
  searchMemory: (query: string, options?: SearchOptions) => Promise<MemoryEntry[]>;
}

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}
