// src/types/config.ts
export interface Config {
  version: string;
  injection: {
    enabled: boolean;
    budget_percent: number;
    budget_max_tokens: number;
    include_user_profile: boolean;
    include_global: boolean;
    include_memories: boolean;
    memory_lookback_days: number;
  };
  git: {
    auto_commit: boolean;
    auto_commit_delay_ms: number;
    commit_message_prefix: string;
  };
  project_detection: {
    enabled: boolean;
    directory_mappings: Record<string, string>;
    auto_detect: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    inject_log: boolean;
  };
}

export interface HistoryOptions {
  limit?: number;
  since?: string;
  path?: string;
}

export interface HistoryEntry {
  hash: string;
  date: string;
  message: string;
  files: string[];
}

export interface DiffResult {
  changes: DiffChange[];
  raw: string;
}

export interface DiffChange {
  type: 'add' | 'delete' | 'modify';
  path: string;
  content: string;
}

export interface RollbackOptions {
  projectPath?: string;
}

export interface RememberOptions {
  projectId?: string;
  tags?: string[];
  source?: string;
}

export interface RecallQuery {
  text?: string;
  projectId?: string;
  tags?: string[];
  since?: Date;
  limit?: number;
}

export interface MemoryEntry {
  id: string;
  content: string;
  projectId?: string;
  tags?: string[];
  source?: string;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  projectId?: string;
  summary: string;
  createdAt: string;
  tags?: string[];
}

export interface SessionQuery {
  projectId?: string;
  tags?: string[];
  since?: Date;
  limit?: number;
}