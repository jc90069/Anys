// ═══════════════════════════════════════════════════════════════
// LOCAL JSON MEMORY PLUGIN
// Simple JSON file-based memory storage
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import {
  Plugin,
  PluginManifest,
  PluginContext,
  MemoryProvider,
  MemoryEntry,
  SearchOptions,
} from '../../../core/types.js';

interface MemoryStore {
  entries: MemoryEntry[];
  lastId: number;
}

class LocalJsonMemoryProvider implements MemoryProvider {
  name = 'local-json';
  private context: PluginContext | null = null;
  private storePath: string;
  private store: MemoryStore = { entries: [], lastId: 0 };
  private maxEntries = 10000;

  constructor() {
    this.storePath = path.join(process.cwd(), 'data', 'memory.json');
  }

  setContext(context: PluginContext): void {
    this.context = context;
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.storePath)) {
        const content = fs.readFileSync(this.storePath, 'utf8');
        this.store = JSON.parse(content);
      }
    } catch (error) {
      this.context?.log.warn('Could not load memory store:', error);
      this.store = { entries: [], lastId: 0 };
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2));
    } catch (error) {
      this.context?.log.error('Could not save memory store:', error);
    }
  }

  async store(entry: MemoryEntry): Promise<string> {
    const id = `mem_${++this.store.lastId}`;
    const newEntry: MemoryEntry = {
      ...entry,
      id,
      timestamp: entry.timestamp || new Date(),
    };

    this.store.entries.push(newEntry);

    // Trim if exceeds max
    if (this.store.entries.length > this.maxEntries) {
      // Remove oldest, lowest importance entries
      this.store.entries.sort((a, b) => {
        const impA = a.importance || 5;
        const impB = b.importance || 5;
        if (impA !== impB) return impA - impB;
        return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
      });
      this.store.entries = this.store.entries.slice(-this.maxEntries);
    }

    this.save();
    return id;
  }

  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    const queryLower = query.toLowerCase();
    let results = this.store.entries.filter(entry => {
      // Simple text search
      const contentMatch = entry.content.toLowerCase().includes(queryLower);

      // Type filter
      if (options?.type && entry.type !== options.type) {
        return false;
      }

      // Importance filter
      if (options?.min_importance && (entry.importance || 0) < options.min_importance) {
        return false;
      }

      // Date filter
      if (options?.since && entry.timestamp) {
        const entryDate = new Date(entry.timestamp);
        if (entryDate < options.since) {
          return false;
        }
      }

      return contentMatch;
    });

    // Sort by relevance (simple: exact match first, then by importance, then by date)
    results.sort((a, b) => {
      const aExact = a.content.toLowerCase() === queryLower;
      const bExact = b.content.toLowerCase() === queryLower;
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;

      const impA = a.importance || 5;
      const impB = b.importance || 5;
      if (impA !== impB) return impB - impA;

      const dateA = new Date(a.timestamp || 0).getTime();
      const dateB = new Date(b.timestamp || 0).getTime();
      return dateB - dateA;
    });

    // Limit
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async get(id: string): Promise<MemoryEntry | null> {
    return this.store.entries.find(e => e.id === id) || null;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.store.entries.findIndex(e => e.id === id);
    if (index !== -1) {
      this.store.entries.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  // Get all entries (for debugging/export)
  getAll(): MemoryEntry[] {
    return [...this.store.entries];
  }

  // Get stats
  getStats(): { count: number; types: Record<string, number> } {
    const types: Record<string, number> = {};
    for (const entry of this.store.entries) {
      types[entry.type] = (types[entry.type] || 0) + 1;
    }
    return { count: this.store.entries.length, types };
  }
}

class LocalJsonPlugin implements Plugin {
  manifest!: PluginManifest;
  memoryProvider: LocalJsonMemoryProvider;

  constructor() {
    this.memoryProvider = new LocalJsonMemoryProvider();
  }

  async onLoad(context: PluginContext): Promise<void> {
    context.log.info('Local JSON memory plugin loaded');
    this.memoryProvider.setContext(context);
  }

  async onEnable(context: PluginContext): Promise<void> {
    const stats = this.memoryProvider.getStats();
    context.log.info(`Memory ready: ${stats.count} entries`);
  }

  async onDisable(context: PluginContext): Promise<void> {
    context.log.info('Local JSON memory plugin disabled');
  }
}

export default LocalJsonPlugin;
