// ═══════════════════════════════════════════════════════════════
// ANYS CONFIGURATION SYSTEM
// Loads and manages YAML configuration
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { AnysConfig } from './types.js';
import { execSync } from 'child_process';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'anys.yaml');
const ENV_PATH = path.join(process.cwd(), 'config', 'secrets.env');

// Default configuration
const defaultConfig: AnysConfig = {
  version: '1.0',

  hardware: {
    chip: 'unknown',
    memory_gb: 8,
    detected: false,
  },

  intelligence: {
    router: {
      strategy: 'auto',
      fallback: true,
    },
    assignments: {
      primary: 'claude-api/sonnet',
      fast: 'claude-api/haiku',
      code: 'claude-api/sonnet',
      complex: 'claude-api/opus',
    },
    thresholds: {
      complexity_for_cloud: 0.7,
      max_local_latency_ms: 5000,
    },
  },

  memory: {
    primary: 'local-json',
    path: './data',
    retention: {
      conversations: 365,
      episodic: 'forever',
    },
  },

  voice: {
    wake_word: 'hey anys',
    wake_word_sensitivity: 0.5,
    stt: 'whisper-local/base',
    tts: 'macos-say',
  },

  plugins: {
    enabled: [
      'models/claude-api',
      'interfaces/cli',
      'memory/local-json',
    ],
    disabled: [],
    auto_update: false,
    sources: ['./plugins'],
  },

  self_improvement: {
    enabled: true,
    can_suggest: ['new_plugins', 'model_upgrades', 'config_changes'],
    auto_apply: ['safe_config_changes'],
    requires_approval: ['new_plugins', 'model_downloads'],
  },
};

// Detect hardware
function detectHardware(): { chip: string; memory_gb: number } {
  try {
    if (process.platform === 'darwin') {
      // macOS: Get chip info
      const chipInfo = execSync('sysctl -n machdep.cpu.brand_string', { encoding: 'utf8' }).trim();

      // Get memory
      const memBytes = parseInt(execSync('sysctl -n hw.memsize', { encoding: 'utf8' }).trim());
      const memGb = Math.round(memBytes / (1024 * 1024 * 1024));

      // Check for Apple Silicon
      let chip = chipInfo;
      try {
        const armCheck = execSync('sysctl -n hw.optional.arm64', { encoding: 'utf8' }).trim();
        if (armCheck === '1') {
          // Get specific Apple chip
          const modelInfo = execSync('system_profiler SPHardwareDataType | grep "Chip"', { encoding: 'utf8' });
          const match = modelInfo.match(/Chip:\s+(.+)/);
          if (match) {
            chip = match[1].trim();
          }
        }
      } catch {
        // Not ARM, use Intel info
      }

      return { chip, memory_gb: memGb };
    }

    // Default for other platforms
    return { chip: 'unknown', memory_gb: 8 };
  } catch (error) {
    console.warn('Could not detect hardware:', error);
    return { chip: 'unknown', memory_gb: 8 };
  }
}

// Deep merge objects
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      );
    } else if (sourceValue !== undefined) {
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }

  return result;
}

// Load environment variables
function loadEnv(): void {
  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (key && value) {
          process.env[key] = value;
        }
      }
    }
  }

  // Also load from check-anys .env if exists (migration)
  const legacyEnv = path.join(process.cwd(), 'check-anys', '.env');
  if (fs.existsSync(legacyEnv)) {
    const content = fs.readFileSync(legacyEnv, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

// Load configuration
export function loadConfig(): AnysConfig {
  loadEnv();

  let userConfig: Partial<AnysConfig> = {};

  // Load user config if exists
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const content = fs.readFileSync(CONFIG_PATH, 'utf8');
      userConfig = YAML.parse(content) || {};
    } catch (error) {
      console.warn('Error parsing config file:', error);
    }
  }

  // Merge with defaults
  const config = deepMerge(defaultConfig, userConfig);

  // Detect hardware if not manually set
  if (!userConfig.hardware?.chip) {
    const hw = detectHardware();
    config.hardware = {
      ...config.hardware,
      ...hw,
      detected: true,
    };
  }

  return config;
}

// Save configuration
export function saveConfig(config: AnysConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = YAML.stringify(config, {
    indent: 2,
    lineWidth: 0,
  });

  fs.writeFileSync(CONFIG_PATH, content, 'utf8');
}

// Create default config file if doesn't exist
export function ensureConfig(): AnysConfig {
  const config = loadConfig();

  if (!fs.existsSync(CONFIG_PATH)) {
    saveConfig(config);
    console.log('Created default config at:', CONFIG_PATH);
  }

  return config;
}

// Get a specific config value by path (e.g., "intelligence.router.strategy")
export function getConfigValue(config: AnysConfig, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = config;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

// Set a specific config value by path
export function setConfigValue(config: AnysConfig, path: string, value: unknown): AnysConfig {
  const parts = path.split('.');
  const result = JSON.parse(JSON.stringify(config)) as AnysConfig;
  let current: Record<string, unknown> = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
  return result;
}
