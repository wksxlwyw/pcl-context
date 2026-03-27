// src/types/context.ts
//
// Canonical type definitions for ContextChunk, ScoredChunk, and IndexDocument
// now live in types/mcp.ts. Re-export them here for backward compatibility.
//
export type {
  ContextChunk,
  ScoredChunk,
  IndexDocument,
} from './mcp.js';

export interface UserProfile {
  name?: string;
  role?: string;
  skills?: string[];
  preferences?: {
    language?: string;
    communication_style?: string;
    code_style?: string;
  };
  output_preferences?: {
    default_language?: string;
    code_comments?: string;
    documentation?: string;
  };
  // Allow dynamic UserProfile fields from YAML
  communication_style?: string;
  code_style?: string;
  [key: string]: unknown;
}

export interface GlobalContext {
  [key: string]: unknown;
}

export interface ProjectContext {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  tech_stack?: {
    frontend?: string[];
    backend?: string[];
    infrastructure?: string[];
    testing?: string[];
  };
  architecture?: {
    pattern?: string;
    api_style?: string;
    auth?: string;
  };
  goals?: string[];
  constraints?: string[];
  target_audience?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  updated_at?: string;
}
