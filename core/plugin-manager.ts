// ═══════════════════════════════════════════════════════════════
// ANYS PLUGIN MANAGER
// Loads, enables, and manages plugins
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import YAML from 'yaml';
import {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginCategory,
  AnysConfig,
  Logger,
  CompletionOptions,
  CompletionResult,
  ActionResult,
  MemoryEntry,
  SearchOptions,
} from './types.js';
import { eventBus, Events } from './event-bus.js';

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private loadedManifests: Map<string, PluginManifest> = new Map();
  private config: AnysConfig;
  private pluginsDir: string;

  constructor(config: AnysConfig, pluginsDir: string = './plugins') {
    this.config = config;
    this.pluginsDir = pluginsDir;
  }

  // Create a logger for a plugin
  private createLogger(pluginName: string): Logger {
    const prefix = `[${pluginName}]`;
    return {
      debug: (msg: string, ...args: unknown[]) => console.debug(prefix, msg, ...args),
      info: (msg: string, ...args: unknown[]) => console.info(prefix, msg, ...args),
      warn: (msg: string, ...args: unknown[]) => console.warn(prefix, msg, ...args),
      error: (msg: string, ...args: unknown[]) => console.error(prefix, msg, ...args),
    };
  }

  // Create context for a plugin
  private createContext(pluginName: string): PluginContext {
    const log = this.createLogger(pluginName);

    return {
      config: this.config,
      log,

      emit: (event: string, data?: unknown) => {
        eventBus.emit(event, pluginName, data);
      },

      on: (event: string, handler: (data: unknown) => void) => {
        eventBus.on(event, (e) => handler(e.data));
      },

      getPlugin: (name: string) => this.plugins.get(name),

      complete: async (options) => {
        return this.complete(options);
      },

      runAction: async (actionId: string, params: Record<string, unknown>) => {
        return this.runAction(actionId, params);
      },

      storeMemory: async (entry: Omit<MemoryEntry, 'id'>) => {
        return this.storeMemory(entry);
      },

      searchMemory: async (query: string, options?: SearchOptions) => {
        return this.searchMemory(query, options);
      },
    };
  }

  // Discover all available plugins
  async discoverPlugins(): Promise<Map<string, PluginManifest>> {
    const manifests = new Map<string, PluginManifest>();
    const categories: PluginCategory[] = ['models', 'actions', 'perceptions', 'memory', 'interfaces'];

    for (const category of categories) {
      const categoryDir = path.join(this.pluginsDir, category);

      if (!fs.existsSync(categoryDir)) {
        continue;
      }

      const pluginDirs = fs.readdirSync(categoryDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      for (const pluginDir of pluginDirs) {
        const manifestPath = path.join(categoryDir, pluginDir, 'manifest.yaml');

        if (fs.existsSync(manifestPath)) {
          try {
            const content = fs.readFileSync(manifestPath, 'utf8');
            const manifest = YAML.parse(content) as PluginManifest;
            manifest.category = category;
            const fullName = `${category}/${manifest.name}`;
            manifests.set(fullName, manifest);
          } catch (error) {
            console.warn(`Error loading manifest for ${category}/${pluginDir}:`, error);
          }
        }
      }
    }

    this.loadedManifests = manifests;
    return manifests;
  }

  // Load a plugin
  async loadPlugin(fullName: string): Promise<Plugin | null> {
    const [category, name] = fullName.split('/');

    // Use absolute paths
    const baseDir = path.resolve(process.cwd(), this.pluginsDir);
    const pluginDir = path.join(baseDir, category, name);
    const jsPath = path.join(pluginDir, 'index.js');
    const tsPath = path.join(pluginDir, 'index.ts');

    const actualPath = fs.existsSync(jsPath) ? jsPath : tsPath;

    if (!fs.existsSync(actualPath)) {
      console.error(`Plugin not found: ${fullName} (looked for ${actualPath})`);
      return null;
    }

    try {
      // Dynamic import using file URL for proper module resolution
      const fileUrl = pathToFileURL(actualPath).href;
      const module = await import(fileUrl);
      const PluginClass = module.default;

      // Get manifest
      const manifestPath = path.join(this.pluginsDir, category, name, 'manifest.yaml');
      let manifest: PluginManifest;

      if (fs.existsSync(manifestPath)) {
        manifest = YAML.parse(fs.readFileSync(manifestPath, 'utf8'));
        manifest.category = category as PluginCategory;
      } else {
        // Create minimal manifest
        manifest = {
          name,
          version: '1.0.0',
          description: 'No description',
          category: category as PluginCategory,
          provides: {},
        };
      }

      // Create plugin instance
      const plugin: Plugin = typeof PluginClass === 'function'
        ? new PluginClass()
        : PluginClass;

      plugin.manifest = manifest;

      // Call onLoad if exists
      const context = this.createContext(fullName);
      if (plugin.onLoad) {
        await plugin.onLoad(context);
      }

      this.plugins.set(fullName, plugin);
      eventBus.emit(Events.PLUGIN_LOADED, 'plugin-manager', { name: fullName });

      return plugin;
    } catch (error) {
      console.error(`Error loading plugin ${fullName}:`, error);
      eventBus.emit(Events.PLUGIN_ERROR, 'plugin-manager', { name: fullName, error });
      return null;
    }
  }

  // Enable a plugin
  async enablePlugin(fullName: string): Promise<boolean> {
    let plugin = this.plugins.get(fullName);

    if (!plugin) {
      plugin = await this.loadPlugin(fullName);
      if (!plugin) return false;
    }

    try {
      const context = this.createContext(fullName);
      if (plugin.onEnable) {
        await plugin.onEnable(context);
      }

      // Start perception providers
      if (plugin.perceptionProvider) {
        await plugin.perceptionProvider.start();
      }

      // Start interface providers
      if (plugin.interfaceProvider) {
        await plugin.interfaceProvider.start();
      }

      eventBus.emit(Events.PLUGIN_ENABLED, 'plugin-manager', { name: fullName });
      return true;
    } catch (error) {
      console.error(`Error enabling plugin ${fullName}:`, error);
      eventBus.emit(Events.PLUGIN_ERROR, 'plugin-manager', { name: fullName, error });
      return false;
    }
  }

  // Disable a plugin
  async disablePlugin(fullName: string): Promise<boolean> {
    const plugin = this.plugins.get(fullName);
    if (!plugin) return false;

    try {
      const context = this.createContext(fullName);

      // Stop perception providers
      if (plugin.perceptionProvider) {
        await plugin.perceptionProvider.stop();
      }

      // Stop interface providers
      if (plugin.interfaceProvider) {
        await plugin.interfaceProvider.stop();
      }

      if (plugin.onDisable) {
        await plugin.onDisable(context);
      }

      eventBus.emit(Events.PLUGIN_DISABLED, 'plugin-manager', { name: fullName });
      return true;
    } catch (error) {
      console.error(`Error disabling plugin ${fullName}:`, error);
      return false;
    }
  }

  // Load all enabled plugins
  async loadEnabledPlugins(): Promise<void> {
    await this.discoverPlugins();

    for (const pluginName of this.config.plugins.enabled) {
      if (this.loadedManifests.has(pluginName)) {
        await this.enablePlugin(pluginName);
      } else {
        console.warn(`Plugin not found: ${pluginName}`);
      }
    }
  }

  // Get a plugin
  getPlugin(fullName: string): Plugin | undefined {
    return this.plugins.get(fullName);
  }

  // Get all plugins
  getAllPlugins(): Map<string, Plugin> {
    return this.plugins;
  }

  // Get plugins by category
  getPluginsByCategory(category: PluginCategory): Plugin[] {
    return Array.from(this.plugins.entries())
      .filter(([name]) => name.startsWith(`${category}/`))
      .map(([, plugin]) => plugin);
  }

  // ═══════════════════════════════════════════════════════════════
  // CAPABILITY METHODS (used by plugin context)
  // ═══════════════════════════════════════════════════════════════

  // Complete with the best available model
  async complete(options: Omit<CompletionOptions, 'model'> & { model?: string }): Promise<CompletionResult> {
    const modelPlugins = this.getPluginsByCategory('models');

    // Determine which model to use
    let modelToUse = options.model || this.config.intelligence.assignments.primary;

    // Find a provider for this model
    for (const plugin of modelPlugins) {
      if (plugin.modelProvider) {
        const isAvailable = await plugin.modelProvider.isAvailable(modelToUse);
        if (isAvailable) {
          return plugin.modelProvider.complete({
            ...options,
            model: modelToUse,
          });
        }
      }
    }

    throw new Error(`No model provider available for: ${modelToUse}`);
  }

  // Run an action
  async runAction(actionId: string, params: Record<string, unknown>): Promise<ActionResult> {
    const [pluginPart, actionName] = actionId.includes('.')
      ? [actionId.split('.')[0], actionId.split('.').slice(1).join('.')]
      : [null, actionId];

    const actionPlugins = this.getPluginsByCategory('actions');

    for (const plugin of actionPlugins) {
      if (plugin.actionProvider) {
        const actions = plugin.actionProvider.listActions();
        const action = actions.find(a =>
          a.id === actionId ||
          a.id === actionName ||
          a.id.endsWith(`.${actionName}`)
        );

        if (action) {
          eventBus.emit(Events.ACTION_STARTED, 'plugin-manager', { actionId, params });

          try {
            const result = await plugin.actionProvider.execute(action.id, params);
            eventBus.emit(Events.ACTION_COMPLETED, 'plugin-manager', { actionId, result });
            return result;
          } catch (error) {
            eventBus.emit(Events.ACTION_FAILED, 'plugin-manager', { actionId, error });
            throw error;
          }
        }
      }
    }

    return { success: false, error: `Action not found: ${actionId}` };
  }

  // Store a memory
  async storeMemory(entry: Omit<MemoryEntry, 'id'>): Promise<string> {
    const memoryPlugins = this.getPluginsByCategory('memory');

    for (const plugin of memoryPlugins) {
      if (plugin.memoryProvider) {
        const id = await plugin.memoryProvider.store(entry as MemoryEntry);
        eventBus.emit(Events.MEMORY_STORED, 'plugin-manager', { id, entry });
        return id;
      }
    }

    throw new Error('No memory provider available');
  }

  // Search memories
  async searchMemory(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    const memoryPlugins = this.getPluginsByCategory('memory');

    for (const plugin of memoryPlugins) {
      if (plugin.memoryProvider) {
        const results = await plugin.memoryProvider.search(query, options);
        eventBus.emit(Events.MEMORY_SEARCHED, 'plugin-manager', { query, count: results.length });
        return results;
      }
    }

    return [];
  }
}
