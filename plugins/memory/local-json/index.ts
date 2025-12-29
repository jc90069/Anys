// ═══════════════════════════════════════════════════════════════
// LOCAL JSON MEMORY PLUGIN
// Simple JSON file-based memory storage
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';

// Inline types
interface MemoryEntry {
  id?: string;
  type: 'fact' | 'preference' | 'decision' | 'conversation' | 'event';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
  importance?: number;
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

interface MemoryStore {
  entries: MemoryEntry[];
  lastId: number;
}

class LocalJsonMemoryProvider implements MemoryProvider {
  name = 'local-json';
  private context: PluginContext | null = null;
  private _dataPath: string;
  private _data: MemoryStore = { entries: [], lastId: 0 };
  private maxEntries = 10000;

  constructor() {
    this._dataPath = path.join(process.cwd(), 'data', 'memory.json');
  }

  setContext(context: PluginContext): void {
    this.context = context;
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this._dataPath)) {
        const content = fs.readFileSync(this._dataPath, 'utf8');
        this._data = JSON.parse(content);
      }
    } catch (error) {
      this.context?.log.warn('Could not load memory store:', error);
      this._data = { entries: [], lastId: 0 };
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this._dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this._dataPath, JSON.stringify(this._data, null, 2));
    } catch (error) {
      this.context?.log.error('Could not save memory store:', error);
    }
  }

  async store(entry: MemoryEntry): Promise<string> {
    const id = `mem_${++this._data.lastId}`;
    const newEntry: MemoryEntry = {
      ...entry,
      id,
      timestamp: entry.timestamp || new Date(),
    };

    this._data.entries.push(newEntry);

    // Trim if exceeds max
    if (this._data.entries.length > this.maxEntries) {
      // Remove oldest, lowest importance entries
      this._data.entries.sort((a, b) => {
        const impA = a.importance || 5;
        const impB = b.importance || 5;
        if (impA !== impB) return impA - impB;
        return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
      });
      this._data.entries = this._data.entries.slice(-this.maxEntries);
    }

    this.save();
    return id;
  }

  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    const queryLower = query.toLowerCase();

    // Extract meaningful words (3+ chars, no stop words)
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'my', 'your', 'what', 'how', 'when', 'where', 'who', 'why', 'am', 'are', 'do', 'does', 'did', 'have', 'has', 'had', 'about', 'you', 'me', 'i']);
    const queryWords = queryLower
      .split(/\s+/)
      .filter(w => w.length >= 3 && !stopWords.has(w));

    // Score each entry by word matches
    const scoredEntries = this._data.entries.map(entry => {
      const contentLower = entry.content.toLowerCase();

      // Type filter
      if (options?.type && entry.type !== options.type) {
        return { entry, score: -1 };
      }

      // Importance filter
      if (options?.min_importance && (entry.importance || 0) < options.min_importance) {
        return { entry, score: -1 };
      }

      // Date filter
      if (options?.since && entry.timestamp) {
        const entryDate = new Date(entry.timestamp);
        if (entryDate < options.since) {
          return { entry, score: -1 };
        }
      }

      // Calculate score based on word matches
      let score = 0;
      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          score += 1;
        }
      }

      // Bonus for exact phrase match
      if (queryWords.length > 0 && contentLower.includes(queryLower)) {
        score += queryWords.length;
      }

      // Boost by importance
      score += (entry.importance || 5) / 10;

      return { entry, score };
    });

    // Filter entries with positive scores and sort
    let results = scoredEntries
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(e => e.entry);

    // Limit
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async get(id: string): Promise<MemoryEntry | null> {
    return this._data.entries.find(e => e.id === id) || null;
  }

  async delete(id: string): Promise<boolean> {
    const index = this._data.entries.findIndex(e => e.id === id);
    if (index !== -1) {
      this._data.entries.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  // Get all entries (for debugging/export)
  getAll(): MemoryEntry[] {
    return [...this._data.entries];
  }

  // Get stats
  getStats(): { count: number; types: Record<string, number> } {
    const types: Record<string, number> = {};
    for (const entry of this._data.entries) {
      types[entry.type] = (types[entry.type] || 0) + 1;
    }
    return { count: this._data.entries.length, types };
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
