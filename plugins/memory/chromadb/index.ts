// ═══════════════════════════════════════════════════════════════
// CHROMADB MEMORY PLUGIN
// Vector database for semantic memory search
// ═══════════════════════════════════════════════════════════════

import { ChromaClient, Collection } from 'chromadb';
import path from 'path';
import fs from 'fs';

// Inline types
interface MemoryEntry {
  id?: string;
  type: 'fact' | 'preference' | 'decision' | 'conversation' | 'event';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
  importance?: number;
  embedding?: number[];
}

interface SearchOptions {
  limit?: number;
  type?: string;
  min_importance?: number;
  since?: Date;
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
}

interface PluginManifest {
  name: string;
  version: string;
  description: string;
  category: string;
  provides: unknown;
}

interface MemoryProvider {
  name: string;
  store(entry: MemoryEntry): Promise<string>;
  search(query: string, options?: SearchOptions): Promise<MemoryEntry[]>;
  get(id: string): Promise<MemoryEntry | null>;
  delete(id: string): Promise<boolean>;
}

interface Plugin {
  manifest: PluginManifest;
  onLoad?(context: PluginContext): Promise<void>;
  onEnable?(context: PluginContext): Promise<void>;
  onDisable?(context: PluginContext): Promise<void>;
  memoryProvider?: MemoryProvider;
}

class ChromaDBMemoryProvider implements MemoryProvider {
  name = 'chromadb';
  private context: PluginContext | null = null;
  private client: ChromaClient | null = null;
  private collection: Collection | null = null;
  private chromaPath: string;
  private collectionName = 'anys_memory';
  private idCounter = 0;

  constructor() {
    this.chromaPath = path.join(process.cwd(), 'data', 'chroma');
  }

  setContext(context: PluginContext): void {
    this.context = context;
  }

  async init(): Promise<void> {
    // Ensure data directory exists
    if (!fs.existsSync(this.chromaPath)) {
      fs.mkdirSync(this.chromaPath, { recursive: true });
    }

    try {
      // Initialize ChromaDB client (ephemeral for now, persistent requires server)
      this.client = new ChromaClient();

      // Get or create collection
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { description: 'Anys memory storage' },
      });

      // Get current count for ID generation
      const count = await this.collection.count();
      this.idCounter = count;

      this.context?.log.info(`ChromaDB initialized with ${count} memories`);
    } catch (error) {
      this.context?.log.error('Failed to initialize ChromaDB:', error);
      throw error;
    }
  }

  async store(entry: MemoryEntry): Promise<string> {
    if (!this.collection) {
      throw new Error('ChromaDB not initialized');
    }

    const id = entry.id || `mem_${++this.idCounter}_${Date.now()}`;

    // Prepare metadata
    const metadata: Record<string, string | number | boolean> = {
      type: entry.type,
      importance: entry.importance || 5,
      timestamp: (entry.timestamp || new Date()).toISOString(),
    };

    // Add any additional metadata (flattened)
    if (entry.metadata) {
      for (const [key, value] of Object.entries(entry.metadata)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          metadata[`meta_${key}`] = value;
        }
      }
    }

    try {
      await this.collection.add({
        ids: [id],
        documents: [entry.content],
        metadatas: [metadata],
      });

      this.context?.log.debug(`Stored memory: ${id}`);
      return id;
    } catch (error) {
      this.context?.log.error('Failed to store memory:', error);
      throw error;
    }
  }

  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    if (!this.collection) {
      throw new Error('ChromaDB not initialized');
    }

    const limit = options?.limit || 10;

    try {
      // Build where clause for filtering
      const whereClause: Record<string, unknown> = {};

      if (options?.type) {
        whereClause['type'] = options.type;
      }

      if (options?.min_importance) {
        whereClause['importance'] = { '$gte': options.min_importance };
      }

      // Query with semantic search
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: limit,
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      });

      // Convert results to MemoryEntry format
      const entries: MemoryEntry[] = [];

      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const id = results.ids[0][i];
          const document = results.documents?.[0]?.[i] || '';
          const metadata = results.metadatas?.[0]?.[i] || {};

          // Extract custom metadata
          const customMetadata: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(metadata)) {
            if (key.startsWith('meta_')) {
              customMetadata[key.replace('meta_', '')] = value;
            }
          }

          entries.push({
            id,
            type: (metadata.type as MemoryEntry['type']) || 'fact',
            content: document,
            importance: typeof metadata.importance === 'number' ? metadata.importance : 5,
            timestamp: metadata.timestamp ? new Date(metadata.timestamp as string) : undefined,
            metadata: Object.keys(customMetadata).length > 0 ? customMetadata : undefined,
          });
        }
      }

      // Filter by date if specified
      if (options?.since) {
        return entries.filter(e => e.timestamp && e.timestamp >= options.since!);
      }

      return entries;
    } catch (error) {
      this.context?.log.error('Failed to search memories:', error);
      return [];
    }
  }

  async get(id: string): Promise<MemoryEntry | null> {
    if (!this.collection) {
      throw new Error('ChromaDB not initialized');
    }

    try {
      const results = await this.collection.get({
        ids: [id],
      });

      if (!results.ids || results.ids.length === 0) {
        return null;
      }

      const document = results.documents?.[0] || '';
      const metadata = results.metadatas?.[0] || {};

      return {
        id,
        type: (metadata.type as MemoryEntry['type']) || 'fact',
        content: document,
        importance: typeof metadata.importance === 'number' ? metadata.importance : 5,
        timestamp: metadata.timestamp ? new Date(metadata.timestamp as string) : undefined,
      };
    } catch (error) {
      this.context?.log.error('Failed to get memory:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!this.collection) {
      throw new Error('ChromaDB not initialized');
    }

    try {
      await this.collection.delete({
        ids: [id],
      });
      return true;
    } catch (error) {
      this.context?.log.error('Failed to delete memory:', error);
      return false;
    }
  }

  // Get stats
  async getStats(): Promise<{ count: number; types: Record<string, number> }> {
    if (!this.collection) {
      return { count: 0, types: {} };
    }

    try {
      const count = await this.collection.count();

      // Get type breakdown (sample-based for performance)
      const results = await this.collection.get({
        limit: 1000,
      });

      const types: Record<string, number> = {};
      if (results.metadatas) {
        for (const meta of results.metadatas) {
          const type = (meta?.type as string) || 'unknown';
          types[type] = (types[type] || 0) + 1;
        }
      }

      return { count, types };
    } catch (error) {
      return { count: 0, types: {} };
    }
  }

  // Semantic similarity search (alias for search with better naming)
  async findSimilar(text: string, limit = 5): Promise<MemoryEntry[]> {
    return this.search(text, { limit });
  }
}

class ChromaDBPlugin implements Plugin {
  manifest!: PluginManifest;
  memoryProvider: ChromaDBMemoryProvider;

  constructor() {
    this.memoryProvider = new ChromaDBMemoryProvider();
  }

  async onLoad(context: PluginContext): Promise<void> {
    context.log.info('ChromaDB plugin loaded');
    this.memoryProvider.setContext(context);
  }

  async onEnable(context: PluginContext): Promise<void> {
    await this.memoryProvider.init();
    const stats = await this.memoryProvider.getStats();
    context.log.info(`ChromaDB ready: ${stats.count} memories`);
  }

  async onDisable(context: PluginContext): Promise<void> {
    context.log.info('ChromaDB plugin disabled');
  }
}

export default ChromaDBPlugin;
