/**
 * API Types - Auto-generated from OpenAPI schema
 *
 * TODO: Use openapi-typescript-codegen to auto-generate these from FastAPI OpenAPI spec
 * For now, manually define based on backend schemas
 */

export interface Project {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  document_count?: number
  config_count?: number
}

export interface ProjectCreate {
  name: string
  description?: string
}

export interface ProjectUpdate {
  name?: string
  description?: string
}

export interface Document {
  id: string
  project_id: string
  filename: string
  file_type: string
  file_size: number
  metadata?: Record<string, any>
  created_at: string
}

export interface DocumentListResponse {
  uploaded: number
  failed: number
  documents: Document[]
}

export interface Config {
  id: string
  project_id: string
  name: string
  chunk_strategy: 'fixed' | 'semantic' | 'recursive'
  chunk_size?: number
  chunk_overlap?: number
  embedding_model: string
  retrieval_strategy: 'dense' | 'hybrid' | 'bm25'
  top_k: number
  settings?: Record<string, any>
  created_at: string
  chunk_count?: number
  status?: 'pending' | 'processing' | 'ready' | 'failed'
}

export interface ConfigCreate {
  name: string
  chunk_strategy: string
  chunk_size?: number
  chunk_overlap?: number
  embedding_model: string
  retrieval_strategy: string
  top_k?: number
  settings?: Record<string, any>
}

export interface ConfigUpdate {
  name?: string
  top_k?: number
  settings?: Record<string, any>
}

export interface Query {
  id: string
  project_id: string
  query_text: string
  ground_truth?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface QueryCreate {
  query_text: string
  ground_truth?: string
  metadata?: Record<string, any>
}

export interface QueryUpdate {
  query_text?: string
  ground_truth?: string
  metadata?: Record<string, any>
}

export interface Experiment {
  id: string
  project_id: string
  name?: string
  config_ids: string[]
  query_ids: string[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  error_message?: string
  created_at: string
  started_at?: string
  completed_at?: string
}

export interface ExperimentCreate {
  name?: string
  config_ids: string[]
  query_ids: string[]
}

export interface ChunkResult {
  id: string
  content: string
  score?: number
}

export interface QueryResult {
  query_id: string
  query_text: string
  chunks: ChunkResult[]
  score?: number
  latency_ms?: number
}

export interface ConfigResult {
  config_id: string
  config_name: string
  avg_score?: number
  avg_latency_ms?: number
  results: QueryResult[]
}

export interface ExperimentResults {
  experiment_id: string
  configs: ConfigResult[]
}

export interface SettingsUpdate {
  openai_api_key?: string
}

export interface SettingsResponse {
  openai_api_key_set: boolean
}
