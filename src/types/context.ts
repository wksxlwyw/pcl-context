// src/types/context.ts
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

export interface ContextChunk {
  id: string;
  projectId?: string;
  type: 'project' | 'memory' | 'session' | 'user-profile';
  content: string;
  tags?: string[];
  updatedAt: string;
  searchScore?: number;
}

export interface ScoredChunk extends ContextChunk {
  finalScore: number;
}

export interface IndexDocument {
  id: string;
  content: string;
  projectId?: string;
  tags?: string[];
  type: string;
  updatedAt: string;
}