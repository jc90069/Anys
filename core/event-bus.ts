// ═══════════════════════════════════════════════════════════════
// ANYS EVENT BUS
// Central communication system for all plugins
// ═══════════════════════════════════════════════════════════════

import EventEmitter from 'eventemitter3';

export interface AnysEvent {
  type: string;
  source: string;
  timestamp: Date;
  data?: unknown;
}

// Core events
export const Events = {
  // System
  SYSTEM_READY: 'system.ready',
  SYSTEM_SHUTDOWN: 'system.shutdown',

  // Plugin lifecycle
  PLUGIN_LOADED: 'plugin.loaded',
  PLUGIN_ENABLED: 'plugin.enabled',
  PLUGIN_DISABLED: 'plugin.disabled',
  PLUGIN_ERROR: 'plugin.error',

  // Messages
  MESSAGE_RECEIVED: 'message.received',
  MESSAGE_RESPONSE: 'message.response',

  // Voice
  VOICE_WAKE_WORD: 'voice.wake_word',
  VOICE_TRANSCRIBED: 'voice.transcribed',
  VOICE_RESPONSE: 'voice.response',

  // Memory
  MEMORY_STORED: 'memory.stored',
  MEMORY_SEARCHED: 'memory.searched',

  // Actions
  ACTION_STARTED: 'action.started',
  ACTION_COMPLETED: 'action.completed',
  ACTION_FAILED: 'action.failed',

  // Perception
  FILE_CHANGED: 'file.changed',
  CLIPBOARD_CHANGED: 'clipboard.changed',
  CALENDAR_EVENT: 'calendar.event',

  // Self-improvement
  SUGGESTION_CREATED: 'suggestion.created',
  HARDWARE_DETECTED: 'hardware.detected',
} as const;

export class EventBus {
  private emitter: EventEmitter;
  private history: AnysEvent[] = [];
  private maxHistory = 1000;

  constructor() {
    this.emitter = new EventEmitter();
  }

  emit(type: string, source: string, data?: unknown): void {
    const event: AnysEvent = {
      type,
      source,
      timestamp: new Date(),
      data,
    };

    // Store in history
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Emit to listeners
    this.emitter.emit(type, event);
    this.emitter.emit('*', event); // Wildcard listeners
  }

  on(type: string, handler: (event: AnysEvent) => void): () => void {
    this.emitter.on(type, handler);
    return () => this.emitter.off(type, handler);
  }

  once(type: string, handler: (event: AnysEvent) => void): void {
    this.emitter.once(type, handler);
  }

  off(type: string, handler: (event: AnysEvent) => void): void {
    this.emitter.off(type, handler);
  }

  // Get recent events
  getHistory(options?: {
    type?: string;
    source?: string;
    limit?: number;
    since?: Date;
  }): AnysEvent[] {
    let events = [...this.history];

    if (options?.type) {
      events = events.filter(e => e.type === options.type);
    }

    if (options?.source) {
      events = events.filter(e => e.source === options.source);
    }

    if (options?.since) {
      events = events.filter(e => e.timestamp >= options.since);
    }

    if (options?.limit) {
      events = events.slice(-options.limit);
    }

    return events;
  }

  // Wait for an event (useful for async flows)
  waitFor(type: string, timeout = 30000): Promise<AnysEvent> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.emitter.off(type, handler);
        reject(new Error(`Timeout waiting for event: ${type}`));
      }, timeout);

      const handler = (event: AnysEvent) => {
        clearTimeout(timer);
        resolve(event);
      };

      this.emitter.once(type, handler);
    });
  }

  // Clear history
  clearHistory(): void {
    this.history = [];
  }

  // Get listener count
  listenerCount(type: string): number {
    return this.emitter.listenerCount(type);
  }
}

// Singleton instance
export const eventBus = new EventBus();
