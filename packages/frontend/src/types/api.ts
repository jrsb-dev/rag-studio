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

export interface EvaluationSettings {
  use_llm_judge?: boolean
  llm_judge_model?: string
  use_ragas?: boolean
}

export interface GenerationSettings {
  enabled?: boolean
  model?: string
  temperature?: number
  max_tokens?: number
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
  evaluation_settings?: EvaluationSettings
  generation_settings?: GenerationSettings
  prompt_template?: string
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
  evaluation_settings?: EvaluationSettings
  generation_settings?: GenerationSettings
  prompt_template?: string
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
  ground_truth_chunk_ids?: string[]
  metadata?: Record<string, any>
  created_at: string
}

export interface QueryCreate {
  query_text: string
  ground_truth?: string
  ground_truth_chunk_ids?: string[]
  metadata?: Record<string, any>
}

export interface QueryUpdate {
  query_text?: string
  ground_truth?: string
  ground_truth_chunk_ids?: string[]
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

export interface Hallucination {
  text: string
  reason: string
}

export interface SupportedClaim {
  claim: string
  source: string
}

export interface AnswerMetrics {
  faithfulness?: number
  answer_relevance?: number
  completeness?: number
  conciseness?: number
  overall_quality?: number
  hallucinations?: Hallucination[]
  hallucination_count?: number
  has_hallucinations?: boolean
  supported_claims?: SupportedClaim[]
  unsupported_claims?: string[]
  reasoning?: string
  strengths?: string[]
  weaknesses?: string[]
  evaluation_model?: string
  evaluation_cost_usd?: number
  tokens_used?: number
  // Generation metadata
  generation_model?: string
  temperature?: number
  prompt_tokens?: number
  completion_tokens?: number
  prompt_sent?: string  // Full prompt sent to LLM
}

export interface QueryResult {
  result_id?: string
  query_id: string
  query_text: string
  chunks: ChunkResult[]
  score?: number
  latency_ms?: number
  metrics?: EvaluationMetrics
  evaluation_cost_usd?: number
  // Answer generation fields
  generated_answer?: string
  generation_cost_usd?: number
  answer_metrics?: AnswerMetrics
}

export interface ConfigResult {
  config_id: string
  config_name: string
  avg_score?: number
  avg_latency_ms?: number
  results: QueryResult[]
}

export interface BasicMetrics {
  mrr?: number
  'ndcg@5'?: number
  'precision@5'?: number
  'recall@5'?: number
  'f1@5'?: number
  'hit_rate@5'?: number
  diversity?: number
  avg_chunk_length?: number
}

export interface LLMJudgeMetrics {
  llm_avg_score?: number
  llm_max_score?: number
  llm_min_score?: number
  'llm_score@1'?: number
  llm_chunk_scores?: number[]
  llm_chunk_evaluations?: Array<{
    chunk_id: string
    score: number
    reasoning: string
    key_points?: string[]
  }>
  llm_judge_model?: string
  llm_eval_cost_usd?: number
}

export interface EvaluationMetrics {
  basic?: BasicMetrics
  llm_judge?: LLMJudgeMetrics
}

export interface CostEstimateRequest {
  num_queries: number
  chunks_per_query?: number
  use_llm_judge?: boolean
  llm_judge_model?: string
  use_ragas?: boolean
}

export interface CostEstimateResponse {
  estimated_cost_usd: number
  breakdown: Record<string, number>
  num_api_calls: number
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
