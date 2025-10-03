# RAG Studio - Evaluation & Metrics System
## Technical Specification v1.0

**Last Updated:** October 3, 2025  
**Status:** Ready for Implementation  
**Priority:** HIGH (Critical Gap)  
**Estimated Effort:** 3-6 weeks

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Proposed Architecture](#3-proposed-architecture)
4. [Database Schema Changes](#4-database-schema-changes)
5. [Backend Implementation](#5-backend-implementation)
6. [Frontend Implementation](#6-frontend-implementation)
7. [API Specification](#7-api-specification)
8. [Testing Strategy](#8-testing-strategy)
9. [Implementation Timeline](#9-implementation-timeline)
10. [Success Metrics](#10-success-metrics)

---

## 1. Executive Summary

### Problem Statement

RAG Studio currently only uses **cosine similarity** to evaluate retrieval quality. This is insufficient because:

- ❌ High similarity ≠ good retrieval
- ❌ No insight into ranking quality
- ❌ No precision/recall metrics
- ❌ No diversity measurement
- ❌ Can't compare configs meaningfully

**Result:** Users can't make data-driven decisions about which config actually works better.

### Solution Overview

Implement a **3-phase evaluation system**:

1. **Phase 1 (Week 1-2):** Basic IR metrics (MRR, NDCG, Precision@K, Recall@K, Diversity)
2. **Phase 2 (Week 3-4):** LLM-as-Judge relevance scoring (optional, costs $0.01/query)
3. **Phase 3 (Week 5-6):** RAGAS framework integration (advanced mode)

### Value Delivered

✅ **Data-driven decisions:** Know WHY config A beats config B  
✅ **No ground truth needed:** LLM judge works out-of-the-box  
✅ **Industry-standard metrics:** MRR, NDCG, Precision@K  
✅ **Cost transparency:** See exact cost before running evals  
✅ **Educational:** Learn what each metric means

---

## 2. Current State Analysis

### What We Have Now

```python
# app/core/retrieval.py - Current implementation
async def calculate_score(
    self,
    query_embedding: List[float],
    chunk_embedding: List[float],
) -> float:
    """Calculate similarity score between query and chunk."""
    import numpy as np
    
    query_array = np.array(query_embedding)
    chunk_array = np.array(chunk_embedding)
    
    # Only cosine similarity
    similarity = float(
        np.dot(query_array, chunk_array)
        / (np.linalg.norm(query_array) * np.linalg.norm(chunk_array))
    )
    
    return similarity
```

**Problems:**
1. Only measures vector similarity, not semantic relevance
2. Doesn't account for ranking (position matters!)
3. No diversity check (all chunks might be similar)
4. No precision/recall (how many relevant chunks found?)
5. No way to validate against ground truth

### What Users See Now

```tsx
// ExperimentResultsPage.tsx - Current results display
<CardDescription>
  Avg Score: {config.avg_score?.toFixed(3) || 'N/A'} • 
  Avg Latency: {config.avg_latency_ms}ms
</CardDescription>
```

**Problems:**
- "Avg Score 0.85" means nothing to users
- No context on what's good vs bad
- Can't debug why retrieval failed
- No actionable insights

---

## 3. Proposed Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Experiment Service                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Run Experiment (existing)                   │    │
│  │  • Execute queries against configs                  │    │
│  │  • Retrieve chunks                                  │    │
│  │  • Measure latency                                  │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │                                          │
│                   ▼                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Evaluation Pipeline (NEW)                   │    │
│  │                                                     │    │
│  │  ┌──────────────────────────────────────────────┐ │    │
│  │  │  Phase 1: Basic IR Metrics                   │ │    │
│  │  │  • MRR, NDCG, Precision@K, Recall@K         │ │    │
│  │  │  • Diversity, Coverage                       │ │    │
│  │  │  • No API calls, instant                     │ │    │
│  │  └──────────────────────────────────────────────┘ │    │
│  │                                                     │    │
│  │  ┌──────────────────────────────────────────────┐ │    │
│  │  │  Phase 2: LLM Judge (optional)               │ │    │
│  │  │  • GPT-3.5/4 relevance scoring              │ │    │
│  │  │  • Per-chunk evaluation                      │ │    │
│  │  │  • Cost: ~$0.01 per query                    │ │    │
│  │  └──────────────────────────────────────────────┘ │    │
│  │                                                     │    │
│  │  ┌──────────────────────────────────────────────┐ │    │
│  │  │  Phase 3: RAGAS (advanced)                   │ │    │
│  │  │  • Context precision/recall                  │ │    │
│  │  │  • Faithfulness, Answer relevancy            │ │    │
│  │  │  • Requires generated answer                 │ │    │
│  │  └──────────────────────────────────────────────┘ │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │                                          │
│                   ▼                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Store Results with Metrics                  │    │
│  │  • All metrics in JSONB column                      │    │
│  │  • Backward compatible                              │    │
│  │  • Cost tracking                                    │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Evaluation Flow

```python
# Pseudocode flow
async def evaluate_retrieval(
    query: Query,
    retrieved_chunks: List[Chunk],
    config: Config
) -> EvaluationResult:
    
    metrics = {}
    
    # ALWAYS run Phase 1 (free, instant)
    basic_metrics = await basic_evaluator.evaluate(
        query=query,
        chunks=retrieved_chunks,
        ground_truth_ids=query.metadata.get("ground_truth_chunks")
    )
    metrics.update(basic_metrics)
    
    # OPTIONAL Phase 2 (costs money, slower)
    if config.settings.get("use_llm_judge"):
        llm_metrics = await llm_evaluator.evaluate(
            query=query.query_text,
            chunks=retrieved_chunks,
            model=config.settings.get("llm_judge_model", "gpt-3.5-turbo")
        )
        metrics.update(llm_metrics)
    
    # OPTIONAL Phase 3 (advanced users)
    if config.settings.get("use_ragas"):
        ragas_metrics = await ragas_evaluator.evaluate(
            query=query.query_text,
            contexts=[c.content for c in retrieved_chunks],
            ground_truth=query.ground_truth,
            answer=query.metadata.get("generated_answer")
        )
        metrics.update(ragas_metrics)
    
    return EvaluationResult(
        metrics=metrics,
        cost=calculate_cost(metrics),
        timestamp=datetime.utcnow()
    )
```

---

## 4. Database Schema Changes

### 4.1 Update Results Table

```sql
-- Migration: Add metrics column and evaluation settings

-- 1. Add metrics JSONB column to store all evaluation results
ALTER TABLE results 
ADD COLUMN metrics JSONB DEFAULT '{}';

-- 2. Add evaluation cost tracking
ALTER TABLE results
ADD COLUMN evaluation_cost_usd DECIMAL(10, 4) DEFAULT 0;

-- 3. Add evaluation timestamp
ALTER TABLE results
ADD COLUMN evaluated_at TIMESTAMP;

-- 4. Create index for metrics queries
CREATE INDEX idx_results_metrics ON results USING GIN (metrics);

-- 5. Example metrics structure (documentation)
COMMENT ON COLUMN results.metrics IS 
'Stores evaluation metrics as JSON:
{
  "basic": {
    "mrr": 0.75,
    "ndcg@5": 0.68,
    "precision@5": 0.80,
    "recall@5": 0.85,
    "f1@5": 0.82,
    "diversity": 0.82,
    "coverage": 0.65
  },
  "llm_judge": {
    "avg_score": 4.2,
    "max_score": 5.0,
    "score@1": 5.0,
    "chunk_scores": [5, 4, 4, 3, 5],
    "reasoning": [
      "Perfectly answers the query...",
      "Contains relevant info but..."
    ]
  },
  "ragas": {
    "context_precision": 0.85,
    "context_recall": 0.90,
    "faithfulness": 0.88,
    "answer_relevancy": 0.92
  },
  "legacy": {
    "avg_cosine_similarity": 0.85
  }
}';
```

### 4.2 Update Configs Table

```sql
-- Add evaluation settings to configs

ALTER TABLE configs
ADD COLUMN evaluation_settings JSONB DEFAULT '{
  "use_llm_judge": false,
  "llm_judge_model": "gpt-3.5-turbo",
  "use_ragas": false,
  "ragas_metrics": ["context_precision", "context_recall"]
}';

-- Index for querying configs by evaluation settings
CREATE INDEX idx_configs_eval_settings ON configs USING GIN (evaluation_settings);
```

### 4.3 Update Queries Table (Ground Truth)

```sql
-- Add ground truth support to queries

ALTER TABLE queries
ADD COLUMN ground_truth_chunk_ids UUID[] DEFAULT '{}';

-- Example: User can mark which chunks should be retrieved
-- UPDATE queries SET ground_truth_chunk_ids = ARRAY['chunk-uuid-1', 'chunk-uuid-2']
-- WHERE id = 'query-uuid';

COMMENT ON COLUMN queries.ground_truth_chunk_ids IS 
'Optional: UUIDs of chunks that should be retrieved for this query.
Used for calculating precision/recall metrics.';
```

### 4.4 Migration Script

```python
# alembic/versions/004_add_evaluation_metrics.py

"""Add evaluation metrics support

Revision ID: 004
Revises: 003
Create Date: 2025-10-03 10:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    # Results table
    op.add_column('results', 
        sa.Column('metrics', postgresql.JSONB(), nullable=True, server_default='{}')
    )
    op.add_column('results',
        sa.Column('evaluation_cost_usd', sa.Numeric(10, 4), server_default='0')
    )
    op.add_column('results',
        sa.Column('evaluated_at', sa.DateTime(), nullable=True)
    )
    op.create_index('idx_results_metrics', 'results', ['metrics'], 
                    postgresql_using='gin')
    
    # Configs table
    op.add_column('configs',
        sa.Column('evaluation_settings', postgresql.JSONB(), 
                  server_default='{"use_llm_judge": false, "use_ragas": false}')
    )
    op.create_index('idx_configs_eval_settings', 'configs', ['evaluation_settings'],
                    postgresql_using='gin')
    
    # Queries table
    op.add_column('queries',
        sa.Column('ground_truth_chunk_ids', postgresql.ARRAY(postgresql.UUID()),
                  server_default='{}')
    )

def downgrade():
    op.drop_column('results', 'metrics')
    op.drop_column('results', 'evaluation_cost_usd')
    op.drop_column('results', 'evaluated_at')
    op.drop_index('idx_results_metrics')
    
    op.drop_column('configs', 'evaluation_settings')
    op.drop_index('idx_configs_eval_settings')
    
    op.drop_column('queries', 'ground_truth_chunk_ids')
```

---

## 5. Backend Implementation

### 5.1 Core Evaluation Classes

#### 5.1.1 Basic IR Metrics Evaluator

```python
# app/core/evaluation/basic_evaluator.py

"""Basic information retrieval metrics evaluator."""

from typing import List, Dict, Optional
import numpy as np
from uuid import UUID

from app.models.chunk import Chunk
from app.models.query import Query


class BasicIREvaluator:
    """Evaluate retrieval using standard IR metrics (no API calls needed)."""
    
    def evaluate(
        self,
        query: Query,
        retrieved_chunks: List[Chunk],
        ground_truth_chunk_ids: Optional[List[UUID]] = None,
        top_k: int = 5
    ) -> Dict[str, float]:
        """
        Calculate all basic IR metrics.
        
        Args:
            query: The query object
            retrieved_chunks: List of retrieved chunks (ordered by relevance)
            ground_truth_chunk_ids: Optional list of ground truth chunk IDs
            top_k: Number of top chunks to consider
            
        Returns:
            Dictionary of metric name -> score
        """
        metrics = {}
        
        # Limit to top_k
        chunks = retrieved_chunks[:top_k]
        retrieved_ids = [str(c.id) for c in chunks]
        
        # Ground truth dependent metrics
        if ground_truth_chunk_ids:
            gt_ids = [str(id) for id in ground_truth_chunk_ids]
            
            metrics["mrr"] = self._calculate_mrr(retrieved_ids, gt_ids)
            metrics[f"ndcg@{top_k}"] = self._calculate_ndcg(retrieved_ids, gt_ids, top_k)
            metrics[f"precision@{top_k}"] = self._calculate_precision(retrieved_ids, gt_ids)
            metrics[f"recall@{top_k}"] = self._calculate_recall(retrieved_ids, gt_ids)
            metrics[f"f1@{top_k}"] = self._calculate_f1(
                metrics[f"precision@{top_k}"], 
                metrics[f"recall@{top_k}"]
            )
            metrics[f"hit_rate@{top_k}"] = self._calculate_hit_rate(retrieved_ids, gt_ids)
        
        # Ground truth independent metrics
        metrics["diversity"] = self._calculate_diversity(chunks)
        metrics["avg_chunk_length"] = self._calculate_avg_length(chunks)
        
        # Backward compatibility - keep existing similarity score
        if chunks and query.query_text:
            metrics["avg_cosine_similarity"] = self._calculate_avg_similarity(
                query, chunks
            )
        
        return metrics
    
    def _calculate_mrr(self, retrieved: List[str], ground_truth: List[str]) -> float:
        """
        Mean Reciprocal Rank.
        
        MRR = 1 / rank of first relevant item
        
        Example:
        - First relevant item at position 2 -> MRR = 1/2 = 0.5
        - First relevant item at position 1 -> MRR = 1/1 = 1.0
        - No relevant items -> MRR = 0.0
        """
        for i, chunk_id in enumerate(retrieved):
            if chunk_id in ground_truth:
                return 1.0 / (i + 1)
        return 0.0
    
    def _calculate_ndcg(
        self, 
        retrieved: List[str], 
        ground_truth: List[str], 
        k: int
    ) -> float:
        """
        Normalized Discounted Cumulative Gain at K.
        
        NDCG considers both relevance and position:
        - Items at top positions get higher weight
        - Normalized to [0, 1] range
        
        Formula:
        DCG = Σ (relevance_i / log2(i + 2))
        IDCG = DCG for perfect ranking
        NDCG = DCG / IDCG
        """
        if not ground_truth:
            return 0.0
        
        # Calculate DCG
        dcg = 0.0
        for i, chunk_id in enumerate(retrieved[:k]):
            relevance = 1.0 if chunk_id in ground_truth else 0.0
            dcg += relevance / np.log2(i + 2)  # i+2 because i starts at 0
        
        # Calculate IDCG (perfect ranking)
        idcg = 0.0
        for i in range(min(k, len(ground_truth))):
            idcg += 1.0 / np.log2(i + 2)
        
        return dcg / idcg if idcg > 0 else 0.0
    
    def _calculate_precision(self, retrieved: List[str], ground_truth: List[str]) -> float:
        """
        Precision at K.
        
        Precision = (# relevant items retrieved) / (# items retrieved)
        
        Example:
        - Retrieved 5 chunks, 4 are relevant -> P@5 = 4/5 = 0.8
        """
        if not retrieved:
            return 0.0
        
        relevant_retrieved = len(set(retrieved) & set(ground_truth))
        return relevant_retrieved / len(retrieved)
    
    def _calculate_recall(self, retrieved: List[str], ground_truth: List[str]) -> float:
        """
        Recall at K.
        
        Recall = (# relevant items retrieved) / (# relevant items total)
        
        Example:
        - 10 relevant chunks exist, retrieved 8 -> R@K = 8/10 = 0.8
        """
        if not ground_truth:
            return 0.0
        
        relevant_retrieved = len(set(retrieved) & set(ground_truth))
        return relevant_retrieved / len(ground_truth)
    
    def _calculate_f1(self, precision: float, recall: float) -> float:
        """
        F1 Score (harmonic mean of precision and recall).
        
        F1 = 2 * (P * R) / (P + R)
        
        Balances precision and recall into single metric.
        """
        if precision + recall == 0:
            return 0.0
        return 2 * (precision * recall) / (precision + recall)
    
    def _calculate_hit_rate(self, retrieved: List[str], ground_truth: List[str]) -> float:
        """
        Hit Rate at K (binary: did we get ANY relevant item?).
        
        Hit Rate = 1 if any relevant item in top K, else 0
        """
        return 1.0 if any(chunk_id in ground_truth for chunk_id in retrieved) else 0.0
    
    def _calculate_diversity(self, chunks: List[Chunk]) -> float:
        """
        Diversity score (how different are the retrieved chunks?).
        
        Calculates average pairwise cosine distance between chunks.
        Higher diversity = less redundant information.
        
        Range: [0, 1] where 1 = maximum diversity
        """
        if len(chunks) < 2:
            return 1.0
        
        # Calculate pairwise similarities
        similarities = []
        for i in range(len(chunks)):
            for j in range(i + 1, len(chunks)):
                if chunks[i].embedding is not None and chunks[j].embedding is not None:
                    sim = self._cosine_similarity(
                        chunks[i].embedding,
                        chunks[j].embedding
                    )
                    similarities.append(sim)
        
        if not similarities:
            return 1.0
        
        # Diversity = 1 - avg_similarity
        avg_similarity = sum(similarities) / len(similarities)
        return 1.0 - avg_similarity
    
    def _calculate_avg_length(self, chunks: List[Chunk]) -> float:
        """Average chunk length in characters."""
        if not chunks:
            return 0.0
        return sum(len(c.content) for c in chunks) / len(chunks)
    
    def _calculate_avg_similarity(self, query: Query, chunks: List[Chunk]) -> float:
        """Legacy: average cosine similarity (backward compatibility)."""
        # TODO: This requires query embedding, which we might not have yet
        # For now, return 0.0 and we'll implement this separately
        return 0.0
    
    @staticmethod
    def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))
```

#### 5.1.2 LLM Judge Evaluator

```python
# app/core/evaluation/llm_evaluator.py

"""LLM-as-Judge relevance evaluator."""

import asyncio
import json
from typing import List, Dict, Any
from openai import AsyncOpenAI

from app.models.chunk import Chunk


class LLMJudgeEvaluator:
    """Evaluate retrieval quality using LLM as judge."""
    
    # Cost per 1K tokens (GPT-3.5-turbo pricing)
    COST_PER_1K_INPUT_TOKENS = 0.0015
    COST_PER_1K_OUTPUT_TOKENS = 0.002
    
    def __init__(self, api_key: str):
        """Initialize with OpenAI API key."""
        self.client = AsyncOpenAI(api_key=api_key)
    
    async def evaluate(
        self,
        query_text: str,
        chunks: List[Chunk],
        model: str = "gpt-3.5-turbo",
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Evaluate chunks using LLM judge.
        
        Args:
            query_text: The user query
            chunks: Retrieved chunks to evaluate
            model: OpenAI model to use
            top_k: Number of chunks to evaluate
            
        Returns:
            Dictionary with scores and reasoning
        """
        # Evaluate chunks in parallel
        tasks = [
            self._evaluate_single_chunk(query_text, chunk, model)
            for chunk in chunks[:top_k]
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Extract scores
        scores = [r["score"] for r in results]
        
        # Calculate cost
        total_cost = sum(r["cost_usd"] for r in results)
        
        return {
            "llm_avg_score": sum(scores) / len(scores) if scores else 0,
            "llm_max_score": max(scores) if scores else 0,
            "llm_min_score": min(scores) if scores else 0,
            "llm_score@1": scores[0] if scores else 0,
            "llm_chunk_scores": scores,
            "llm_chunk_evaluations": results,
            "llm_judge_model": model,
            "llm_eval_cost_usd": round(total_cost, 4)
        }
    
    async def _evaluate_single_chunk(
        self,
        query: str,
        chunk: Chunk,
        model: str
    ) -> Dict[str, Any]:
        """Evaluate a single chunk's relevance."""
        
        prompt = self._build_evaluation_prompt(query, chunk.content)
        
        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert evaluator for retrieval systems. Rate retrieved chunks objectively."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0,
                max_tokens=200
            )
            
            # Parse JSON response
            result = json.loads(response.choices[0].message.content)
            
            # Calculate cost
            usage = response.usage
            cost_usd = (
                (usage.prompt_tokens / 1000) * self.COST_PER_1K_INPUT_TOKENS +
                (usage.completion_tokens / 1000) * self.COST_PER_1K_OUTPUT_TOKENS
            )
            
            return {
                "chunk_id": str(chunk.id),
                "score": result.get("score", 0),
                "reasoning": result.get("reasoning", ""),
                "key_points": result.get("key_points", []),
                "cost_usd": cost_usd,
                "tokens_used": usage.total_tokens
            }
            
        except Exception as e:
            return {
                "chunk_id": str(chunk.id),
                "score": 0,
                "reasoning": f"Error: {str(e)}",
                "error": str(e),
                "cost_usd": 0,
                "tokens_used": 0
            }
    
    def _build_evaluation_prompt(self, query: str, chunk: str) -> str:
        """Build evaluation prompt for LLM judge."""
        return f"""You are evaluating how well a retrieved chunk answers a user's query.

**Query:** "{query}"

**Retrieved Chunk:**
```
{chunk[:1000]}  # Limit chunk length to control costs
```

Rate this chunk's relevance on a scale of 1-5:
- **5**: Perfectly answers the query, contains all key information
- **4**: Highly relevant, contains most key information
- **3**: Somewhat relevant, contains partial information
- **2**: Marginally relevant, tangentially related
- **1**: Not relevant at all

Respond in JSON format:
{{
  "score": <1-5>,
  "reasoning": "<brief explanation of why this score>",
  "key_points": ["<relevant point 1>", "<relevant point 2>"]
}}

Be objective and consistent in your scoring."""

    @staticmethod
    def estimate_cost(num_queries: int, chunks_per_query: int, model: str = "gpt-3.5-turbo") -> float:
        """
        Estimate cost for evaluation.
        
        Args:
            num_queries: Number of queries to evaluate
            chunks_per_query: Chunks per query (typically top_k)
            model: OpenAI model
            
        Returns:
            Estimated cost in USD
        """
        # Rough estimate: ~500 tokens input + 100 tokens output per chunk
        total_chunks = num_queries * chunks_per_query
        
        if model == "gpt-3.5-turbo":
            input_cost = (total_chunks * 500 / 1000) * 0.0015
            output_cost = (total_chunks * 100 / 1000) * 0.002
        elif model == "gpt-4-turbo":
            input_cost = (total_chunks * 500 / 1000) * 0.01
            output_cost = (total_chunks * 100 / 1000) * 0.03
        else:
            # Default to GPT-3.5 pricing
            input_cost = (total_chunks * 500 / 1000) * 0.0015
            output_cost = (total_chunks * 100 / 1000) * 0.002
        
        return round(input_cost + output_cost, 4)
```

#### 5.1.3 RAGAS Evaluator

```python
# app/core/evaluation/ragas_evaluator.py

"""RAGAS framework integration for advanced evaluation."""

from typing import List, Dict, Optional
from ragas import evaluate
from ragas.metrics import (
    context_precision,
    context_recall,
    faithfulness,
    answer_relevancy
)
from datasets import Dataset


class RAGASEvaluator:
    """Advanced RAG evaluation using RAGAS framework."""
    
    def __init__(self, llm_client, embeddings_client):
        """
        Initialize with LLM and embeddings clients.
        
        Args:
            llm_client: LangChain LLM for evaluation
            embeddings_client: LangChain embeddings for similarity
        """
        self.llm = llm_client
        self.embeddings = embeddings_client
    
    async def evaluate(
        self,
        query: str,
        contexts: List[str],
        ground_truth: Optional[str] = None,
        answer: Optional[str] = None
    ) -> Dict[str, float]:
        """
        Run RAGAS evaluation.
        
        Args:
            query: User query
            contexts: Retrieved context chunks
            ground_truth: Expected answer (optional)
            answer: Generated answer (optional, for faithfulness)
            
        Returns:
            Dictionary of metric name -> score
        """
        # Build dataset
        dataset_dict = {
            "question": [query],
            "contexts": [contexts]
        }
        
        # Add optional fields
        if ground_truth:
            dataset_dict["ground_truth"] = [ground_truth]
        
        if answer:
            dataset_dict["answer"] = [answer]
        
        dataset = Dataset.from_dict(dataset_dict)
        
        # Select metrics based on available data
        metrics = self._select_metrics(has_ground_truth=bool(ground_truth), has_answer=bool(answer))
        
        # Run evaluation
        result = evaluate(
            dataset,
            metrics=metrics,
            llm=self.llm,
            embeddings=self.embeddings
        )
        
        # Extract scores
        scores = result.to_pandas().to_dict('records')[0]
        
        # Add prefix to avoid naming conflicts
        return {
            f"ragas_{k}": v for k, v in scores.items()
        }
    
    def _select_metrics(self, has_ground_truth: bool, has_answer: bool) -> List:
        """Select appropriate metrics based on available data."""
        metrics = []
        
        # Context metrics (need ground truth)
        if has_ground_truth:
            metrics.extend([
                context_precision,  # How many retrieved contexts are relevant?
                context_recall      # How much of ground truth is in contexts?
            ])
        
        # Answer metrics (need generated answer)
        if has_answer:
            metrics.extend([
                faithfulness,      # Is answer based on contexts?
                answer_relevancy   # Does answer address the question?
            ])
        
        return metrics
```

#### 5.1.4 Unified Evaluation Service

```python
# app/core/evaluation/evaluator.py

"""Unified evaluation service that orchestrates all evaluators."""

from typing import List, Dict, Any, Optional
from uuid import UUID

from app.models.chunk import Chunk
from app.models.query import Query
from app.models.config import Config
from app.core.evaluation.basic_evaluator import BasicIREvaluator
from app.core.evaluation.llm_evaluator import LLMJudgeEvaluator
from app.core.evaluation.ragas_evaluator import RAGASEvaluator


class EvaluationService:
    """Orchestrates all evaluation methods."""
    
    def __init__(self, openai_api_key: Optional[str] = None):
        """Initialize evaluation service."""
        self.basic_evaluator = BasicIREvaluator()
        
        if openai_api_key:
            self.llm_evaluator = LLMJudgeEvaluator(api_key=openai_api_key)
        else:
            self.llm_evaluator = None
    
    async def evaluate_retrieval(
        self,
        query: Query,
        retrieved_chunks: List[Chunk],
        config: Config,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Run complete evaluation pipeline.
        
        Args:
            query: Query object
            retrieved_chunks: Retrieved chunks
            config: Config with evaluation settings
            top_k: Number of top chunks to evaluate
            
        Returns:
            Complete evaluation results with all metrics
        """
        all_metrics = {}
        total_cost = 0.0
        
        # PHASE 1: Basic IR metrics (always run, free)
        basic_metrics = self.basic_evaluator.evaluate(
            query=query,
            retrieved_chunks=retrieved_chunks,
            ground_truth_chunk_ids=query.ground_truth_chunk_ids,
            top_k=top_k
        )
        all_metrics["basic"] = basic_metrics
        
        # PHASE 2: LLM Judge (optional, costs money)
        eval_settings = config.evaluation_settings or {}
        
        if eval_settings.get("use_llm_judge") and self.llm_evaluator:
            llm_model = eval_settings.get("llm_judge_model", "gpt-3.5-turbo")
            
            llm_metrics = await self.llm_evaluator.evaluate(
                query_text=query.query_text,
                chunks=retrieved_chunks,
                model=llm_model,
                top_k=top_k
            )
            
            all_metrics["llm_judge"] = llm_metrics
            total_cost += llm_metrics.get("llm_eval_cost_usd", 0)
        
        # PHASE 3: RAGAS (optional, advanced)
        if eval_settings.get("use_ragas"):
            # TODO: Implement RAGAS integration
            # Requires LangChain LLM and embeddings setup
            pass
        
        return {
            "metrics": all_metrics,
            "total_cost_usd": round(total_cost, 4),
            "top_k": top_k
        }
    
    @staticmethod
    def get_primary_score(metrics: Dict[str, Any]) -> float:
        """
        Get single primary score for ranking configs.
        
        Priority:
        1. RAGAS composite (if available)
        2. LLM judge avg (if available)
        3. NDCG@5 (if ground truth available)
        4. Diversity score (fallback)
        """
        # Try RAGAS composite
        if "ragas" in metrics:
            ragas = metrics["ragas"]
            if "ragas_context_precision" in ragas and "ragas_context_recall" in ragas:
                # F1 of precision and recall
                p = ragas["ragas_context_precision"]
                r = ragas["ragas_context_recall"]
                if p + r > 0:
                    return 2 * (p * r) / (p + r)
        
        # Try LLM judge
        if "llm_judge" in metrics:
            llm = metrics["llm_judge"]
            if "llm_avg_score" in llm:
                # Normalize to 0-1 range (LLM score is 1-5)
                return (llm["llm_avg_score"] - 1) / 4
        
        # Try NDCG
        if "basic" in metrics:
            basic = metrics["basic"]
            for key in ["ndcg@5", "ndcg@3", "ndcg@10"]:
                if key in basic:
                    return basic[key]
            
            # Try F1
            for key in ["f1@5", "f1@3", "f1@10"]:
                if key in basic:
                    return basic[key]
        
        # Fallback to diversity
        if "basic" in metrics and "diversity" in metrics["basic"]:
            return metrics["basic"]["diversity"]
        
        return 0.0
```

### 5.2 Update Experiment Service

```python
# app/services/experiment_service.py - Updated sections

from app.core.evaluation.evaluator import EvaluationService

class ExperimentService:
    """Service for experiment-related operations."""
    
    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db
        self.evaluation_service = None  # Will be initialized with API key
    
    async def _run_experiment(self, experiment: Experiment) -> None:
        """Run experiment by testing all config/query combinations."""
        
        # Get OpenAI API key from settings
        from app.services.settings_service import SettingsService
        settings_service = SettingsService(self.db)
        api_key = await settings_service.get_openai_key()
        
        if not api_key:
            raise ValueError("OpenAI API key not configured. Please set it in Settings.")
        
        # Initialize evaluation service
        self.evaluation_service = EvaluationService(openai_api_key=api_key)
        
        # ... existing code to get queries, configs, embedding_service, retrieval_service ...
        
        # Test each config against each query
        for config in configs:
            for query in queries:
                try:
                    # 1. Generate query embedding (existing)
                    start_time = time.time()
                    query_embedding = await embedding_service.embed_single(
                        text=query.query_text,
                        model=config.embedding_model,
                    )
                    
                    # 2. Retrieve chunks (existing)
                    chunks = await retrieval_service.search_dense(
                        query_embedding=query_embedding,
                        config_id=config.id,
                        top_k=config.top_k,
                    )
                    
                    end_time = time.time()
                    latency_ms = int((end_time - start_time) * 1000)
                    
                    # 3. NEW: Run comprehensive evaluation
                    evaluation_result = await self.evaluation_service.evaluate_retrieval(
                        query=query,
                        retrieved_chunks=chunks,
                        config=config,
                        top_k=config.top_k
                    )
                    
                    # 4. Get primary score for ranking
                    primary_score = EvaluationService.get_primary_score(
                        evaluation_result["metrics"]
                    )
                    
                    # 5. Create result with new metrics
                    result = Result(
                        experiment_id=experiment.id,
                        config_id=config.id,
                        query_id=query.id,
                        retrieved_chunk_ids=[chunk.id for chunk in chunks],
                        score=primary_score,  # Primary score for ranking
                        latency_ms=latency_ms,
                        metrics=evaluation_result["metrics"],  # NEW: Full metrics
                        evaluation_cost_usd=evaluation_result["total_cost_usd"],  # NEW: Cost
                        evaluated_at=datetime.utcnow(),  # NEW: Timestamp
                        result_metadata={
                            "num_chunks": len(chunks),
                            "config_name": config.name,
                            "query_text": query.query_text,
                        }
                    )
                    
                    self.db.add(result)
                
                except ValueError as e:
                    # Handle dimension mismatch or other errors
                    result = Result(
                        experiment_id=experiment.id,
                        config_id=config.id,
                        query_id=query.id,
                        retrieved_chunk_ids=[],
                        score=None,
                        latency_ms=0,
                        metrics={"error": str(e)},
                        result_metadata={
                            "error": str(e),
                            "config_name": config.name,
                            "query_text": query.query_text,
                        },
                    )
                    self.db.add(result)
                    continue
        
        await self.db.commit()
```

### 5.3 Update Pydantic Schemas

```python
# app/schemas/result.py - New schemas

from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import datetime


class MetricsResponse(BaseModel):
    """Metrics response schema."""
    
    basic: Optional[Dict[str, float]] = Field(None, description="Basic IR metrics")
    llm_judge: Optional[Dict[str, Any]] = Field(None, description="LLM judge metrics")
    ragas: Optional[Dict[str, float]] = Field(None, description="RAGAS metrics")


class ResultResponse(BaseModel):
    """Enhanced result response with metrics."""
    
    id: UUID
    experiment_id: UUID
    config_id: UUID
    query_id: UUID
    retrieved_chunk_ids: list[UUID]
    score: Optional[float] = Field(None, description="Primary score for ranking")
    latency_ms: Optional[int]
    metrics: Optional[MetricsResponse] = Field(None, description="Detailed metrics")
    evaluation_cost_usd: Optional[float] = Field(None, description="Cost of evaluation")
    evaluated_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class EvaluationSettingsUpdate(BaseModel):
    """Schema for updating evaluation settings."""
    
    use_llm_judge: bool = Field(False, description="Enable LLM judge evaluation")
    llm_judge_model: str = Field("gpt-3.5-turbo", description="Model for LLM judge")
    use_ragas: bool = Field(False, description="Enable RAGAS evaluation")
    ragas_metrics: list[str] = Field(
        default=["context_precision", "context_recall"],
        description="RAGAS metrics to compute"
    )


class CostEstimateRequest(BaseModel):
    """Request for cost estimation."""
    
    num_queries: int = Field(..., ge=1, description="Number of queries")
    chunks_per_query: int = Field(5, ge=1, le=20, description="Chunks per query (top_k)")
    use_llm_judge: bool = Field(False)
    llm_judge_model: str = Field("gpt-3.5-turbo")
    use_ragas: bool = Field(False)


class CostEstimateResponse(BaseModel):
    """Cost estimation response."""
    
    estimated_cost_usd: float
    breakdown: Dict[str, float] = Field(
        description="Cost breakdown by evaluation method"
    )
    num_api_calls: int = Field(description="Total API calls needed")
```

---

## 6. Frontend Implementation

### 6.1 Update Config Form

```tsx
// components/ConfigEvaluationSettings.tsx

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, DollarSign } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface EvaluationSettings {
  use_llm_judge: boolean
  llm_judge_model: string
  use_ragas: boolean
}

interface Props {
  settings: EvaluationSettings
  onChange: (settings: EvaluationSettings) => void
  estimatedCost?: number
}

export default function ConfigEvaluationSettings({ settings, onChange, estimatedCost }: Props) {
  return (
    <div className="space-y-4 border rounded-lg p-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        Evaluation Settings
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>Configure how experiments will evaluate retrieval quality.</p>
              <p className="mt-2">Basic metrics (MRR, NDCG, Precision) are always free and instant.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </h3>

      {/* Basic Metrics - Always Enabled */}
      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="font-medium">Basic IR Metrics</span>
          <span className="text-xs text-green-700 dark:text-green-300">Always enabled • Free • Instant</span>
        </div>
        <p className="text-sm text-muted-foreground">
          MRR, NDCG@K, Precision@K, Recall@K, F1@K, Diversity
        </p>
      </div>

      {/* LLM Judge */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="llm-judge">LLM Judge Evaluation</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>Uses GPT to rate chunk relevance on 1-5 scale.</p>
                  <p className="mt-2"><strong>Pros:</strong> Works without ground truth, objective scoring</p>
                  <p className="mt-1"><strong>Cons:</strong> Costs ~$0.01 per query</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch
            id="llm-judge"
            checked={settings.use_llm_judge}
            onCheckedChange={(checked) => 
              onChange({ ...settings, use_llm_judge: checked })
            }
          />
        </div>

        {settings.use_llm_judge && (
          <div className="ml-6 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="llm-model">Model</Label>
              <Select
                value={settings.llm_judge_model}
                onValueChange={(value) => 
                  onChange({ ...settings, llm_judge_model: value })
                }
              >
                <SelectTrigger id="llm-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-3.5-turbo">
                    GPT-3.5 Turbo (Recommended) - ~$0.01/query
                  </SelectItem>
                  <SelectItem value="gpt-4-turbo">
                    GPT-4 Turbo (More accurate) - ~$0.05/query
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {estimatedCost !== undefined && (
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  Estimated cost: <strong>${estimatedCost.toFixed(4)}</strong> per experiment
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>

      {/* RAGAS - Phase 3 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="ragas">RAGAS Evaluation</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>Advanced metrics: context precision/recall, faithfulness, answer relevancy.</p>
                  <p className="mt-2"><strong>Requires:</strong> Ground truth answers and/or generated answers</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch
            id="ragas"
            checked={settings.use_ragas}
            onCheckedChange={(checked) => 
              onChange({ ...settings, use_ragas: checked })
            }
          />
        </div>

        {settings.use_ragas && (
          <Alert variant="warning">
            <AlertDescription>
              RAGAS requires ground truth answers. Make sure your queries have expected answers set.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
```

### 6.2 Enhanced Results Display

```tsx
// components/MetricsDisplay.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Metrics {
  basic?: {
    mrr?: number
    'ndcg@5'?: number
    'precision@5'?: number
    'recall@5'?: number
    'f1@5'?: number
    diversity?: number
  }
  llm_judge?: {
    llm_avg_score?: number
    llm_score_1?: number
    llm_chunk_scores?: number[]
    llm_eval_cost_usd?: number
  }
}

interface Props {
  configName: string
  metrics: Metrics
  rank: number
  isWinner: boolean
}

export default function MetricsDisplay({ configName, metrics, rank, isWinner }: Props) {
  const getScoreColor = (score: number, max: number = 1) => {
    const normalized = score / max
    if (normalized >= 0.8) return 'text-green-600'
    if (normalized >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreIcon = (score: number, max: number = 1) => {
    const normalized = score / max
    if (normalized >= 0.8) return <TrendingUp className="h-4 w-4" />
    if (normalized >= 0.6) return <Minus className="h-4 w-4" />
    return <TrendingDown className="h-4 w-4" />
  }

  return (
    <Card className={isWinner ? 'border-green-500 border-2' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isWinner && <Badge variant="default">🏆 Winner</Badge>}
            <Badge variant="outline">#{rank}</Badge>
            <CardTitle>{configName}</CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Basic IR Metrics */}
        {metrics.basic && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              Information Retrieval Metrics
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p>Standard metrics for evaluating search quality.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* MRR */}
              {metrics.basic.mrr !== undefined && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">MRR</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>Mean Reciprocal Rank</strong></p>
                          <p className="mt-1">Measures: Position of first relevant result</p>
                          <p className="mt-1">Higher = Better (0-1 scale)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className={`flex items-center gap-1 font-bold ${getScoreColor(metrics.basic.mrr)}`}>
                    {getScoreIcon(metrics.basic.mrr)}
                    {metrics.basic.mrr.toFixed(3)}
                  </div>
                </div>
              )}

              {/* NDCG@5 */}
              {metrics.basic['ndcg@5'] !== undefined && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">NDCG@5</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>Normalized Discounted Cumulative Gain</strong></p>
                          <p className="mt-1">Measures: Ranking quality (position matters)</p>
                          <p className="mt-1">Higher = Better (0-1 scale)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className={`flex items-center gap-1 font-bold ${getScoreColor(metrics.basic['ndcg@5'])}`}>
                    {getScoreIcon(metrics.basic['ndcg@5'])}
                    {metrics.basic['ndcg@5'].toFixed(3)}
                  </div>
                </div>
              )}

              {/* Precision@5 */}
              {metrics.basic['precision@5'] !== undefined && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Precision@5</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>Precision at 5</strong></p>
                          <p className="mt-1">Measures: % of top 5 results that are relevant</p>
                          <p className="mt-1">Higher = Better (0-1 scale)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className={`flex items-center gap-1 font-bold ${getScoreColor(metrics.basic['precision@5'])}`}>
                    {getScoreIcon(metrics.basic['precision@5'])}
                    {(metrics.basic['precision@5'] * 100).toFixed(0)}%
                  </div>
                </div>
              )}

              {/* Recall@5 */}
              {metrics.basic['recall@5'] !== undefined && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Recall@5</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>Recall at 5</strong></p>
                          <p className="mt-1">Measures: % of relevant items found in top 5</p>
                          <p className="mt-1">Higher = Better (0-1 scale)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className={`flex items-center gap-1 font-bold ${getScoreColor(metrics.basic['recall@5'])}`}>
                    {getScoreIcon(metrics.basic['recall@5'])}
                    {(metrics.basic['recall@5'] * 100).toFixed(0)}%
                  </div>
                </div>
              )}

              {/* F1@5 */}
              {metrics.basic['f1@5'] !== undefined && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">F1@5</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>F1 Score at 5</strong></p>
                          <p className="mt-1">Measures: Balance of precision & recall</p>
                          <p className="mt-1">Higher = Better (0-1 scale)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className={`flex items-center gap-1 font-bold ${getScoreColor(metrics.basic['f1@5'])}`}>
                    {getScoreIcon(metrics.basic['f1@5'])}
                    {metrics.basic['f1@5'].toFixed(3)}
                  </div>
                </div>
              )}

              {/* Diversity */}
              {metrics.basic.diversity !== undefined && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Diversity</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>Result Diversity</strong></p>
                          <p className="mt-1">Measures: How different chunks are from each other</p>
                          <p className="mt-1">Higher = Less redundancy (0-1 scale)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className={`flex items-center gap-1 font-bold ${getScoreColor(metrics.basic.diversity)}`}>
                    {getScoreIcon(metrics.basic.diversity)}
                    {metrics.basic.diversity.toFixed(3)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LLM Judge Metrics */}
        {metrics.llm_judge && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              LLM Judge Evaluation
              <Badge variant="secondary" className="text-xs">
                Cost: ${metrics.llm_judge.llm_eval_cost_usd?.toFixed(4) || '0.00'}
              </Badge>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* Average Score */}
              {metrics.llm_judge.llm_avg_score !== undefined && (
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="text-sm">Average Score</span>
                  <div className={`font-bold ${getScoreColor(metrics.llm_judge.llm_avg_score, 5)}`}>
                    {metrics.llm_judge.llm_avg_score.toFixed(2)}/5
                  </div>
                </div>
              )}

              {/* Top Chunk Score */}
              {metrics.llm_judge.llm_score_1 !== undefined && (
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="text-sm">Top Chunk</span>
                  <div className={`font-bold ${getScoreColor(metrics.llm_judge.llm_score_1, 5)}`}>
                    {metrics.llm_judge.llm_score_1}/5
                  </div>
                </div>
              )}
            </div>

            {/* Chunk Scores Breakdown */}
            {metrics.llm_judge.llm_chunk_scores && (
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Chunk Scores:</span>
                <div className="flex gap-1">
                  {metrics.llm_judge.llm_chunk_scores.map((score, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 h-2 rounded ${
                        score >= 4 ? 'bg-green-500' :
                        score >= 3 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      title={`Chunk ${idx + 1}: ${score}/5`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### 6.3 Cost Estimator Component

```tsx
// components/CostEstimator.tsx

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, Calculator } from 'lucide-react'
import { api } from '@/api/client'

interface Props {
  numQueries: number
  numConfigs: number
  chunksPerQuery: number
  useLLMJudge: boolean
  llmJudgeModel: string
  useRAGAS: boolean
}

export default function CostEstimator({
  numQueries,
  numConfigs,
  chunksPerQuery,
  useLLMJudge,
  llmJudgeModel,
  useRAGAS
}: Props) {
  const [estimate, setEstimate] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchEstimate = async () => {
      if (!useLLMJudge && !useRAGAS) {
        setEstimate(0)
        return
      }

      setLoading(true)
      try {
        const response = await api.post('/experiments/estimate-cost', {
          num_queries: numQueries * numConfigs,
          chunks_per_query: chunksPerQuery,
          use_llm_judge: useLLMJudge,
          llm_judge_model: llmJudgeModel,
          use_ragas: useRAGAS
        })
        setEstimate(response.data.estimated_cost_usd)
      } catch (error) {
        console.error('Failed to estimate cost:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEstimate()
  }, [numQueries, numConfigs, chunksPerQuery, useLLMJudge, llmJudgeModel, useRAGAS])

  if (!useLLMJudge && !useRAGAS) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <Calculator className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Free evaluation</strong> - Using basic IR metrics only (no API costs)
        </AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return (
      <Alert>
        <Calculator className="h-4 w-4" />
        <AlertDescription>Calculating cost estimate...</AlertDescription>
      </Alert>
    )
  }

  const totalCost = estimate || 0
  const perQuery = totalCost / (numQueries * numConfigs)

  return (
    <Alert className={totalCost > 1 ? 'border-yellow-500 bg-yellow-50' : ''}>
      <DollarSign className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-1">
          <div className="font-semibold">
            Estimated Cost: ${totalCost.toFixed(4)}
          </div>
          <div className="text-xs text-muted-foreground">
            ~${perQuery.toFixed(4)} per query • {numQueries} queries × {numConfigs} configs
          </div>
          {totalCost > 1 && (
            <div className="text-xs text-yellow-700 mt-2">
              ⚠️ This experiment will cost more than $1. Consider reducing queries or disabling LLM judge.
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}
```

---

## 7. API Specification

### 7.1 New Endpoints

#### Cost Estimation

```
POST /api/experiments/estimate-cost
```

**Request:**
```json
{
  "num_queries": 10,
  "chunks_per_query": 5,
  "use_llm_judge": true,
  "llm_judge_model": "gpt-3.5-turbo",
  "use_ragas": false
}
```

**Response:**
```json
{
  "estimated_cost_usd": 0.5,
  "breakdown": {
    "llm_judge": 0.5,
    "ragas": 0.0
  },
  "num_api_calls": 50
}
```

#### Update Config Evaluation Settings

```
PATCH /api/projects/{project_id}/configs/{config_id}/evaluation-settings
```

**Request:**
```json
{
  "use_llm_judge": true,
  "llm_judge_model": "gpt-3.5-turbo",
  "use_ragas": false,
  "ragas_metrics": ["context_precision", "context_recall"]
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Config A",
  "evaluation_settings": {
    "use_llm_judge": true,
    "llm_judge_model": "gpt-3.5-turbo",
    "use_ragas": false
  },
  ...
}
```

#### Get Experiment Results (Enhanced)

```
GET /api/experiments/{experiment_id}/results
```

**Response:**
```json
{
  "experiment_id": "uuid",
  "total_cost_usd": 1.25,
  "configs": [
    {
      "config_id": "uuid",
      "config_name": "Config A",
      "avg_score": 0.85,
      "avg_latency_ms": 250,
      "total_cost_usd": 0.50,
      "results": [
        {
          "query_id": "uuid",
          "query_text": "What are the features?",
          "score": 0.92,
          "latency_ms": 230,
          "metrics": {
            "basic": {
              "mrr": 0.75,
              "ndcg@5": 0.68,
              "precision@5": 0.80,
              "recall@5": 0.85,
              "f1@5": 0.82,
              "diversity": 0.82
            },
            "llm_judge": {
              "llm_avg_score": 4.2,
              "llm_score@1": 5.0,
              "llm_chunk_scores": [5, 4, 4, 3, 5],
              "llm_eval_cost_usd": 0.01
            }
          },
          "chunks": [...]
        }
      ]
    }
  ]
}
```

### 7.2 Updated Endpoints

All existing endpoints remain unchanged for backward compatibility. New fields are additive:

- `Result` model adds: `metrics`, `evaluation_cost_usd`, `evaluated_at`
- `Config` model adds: `evaluation_settings`
- `Query` model adds: `ground_truth_chunk_ids`

---

## 8. Testing Strategy

### 8.1 Unit Tests

```python
# tests/test_basic_evaluator.py

import pytest
from app.core.evaluation.basic_evaluator import BasicIREvaluator

def test_mrr_calculation():
    """Test MRR calculation."""
    evaluator = BasicIREvaluator()
    
    # First relevant at position 2
    assert evaluator._calculate_mrr(
        retrieved=["a", "b", "c"],
        ground_truth=["b", "d"]
    ) == 0.5
    
    # First relevant at position 1
    assert evaluator._calculate_mrr(
        retrieved=["a", "b", "c"],
        ground_truth=["a", "d"]
    ) == 1.0
    
    # No relevant items
    assert evaluator._calculate_mrr(
        retrieved=["a", "b", "c"],
        ground_truth=["d", "e"]
    ) == 0.0

def test_precision_recall():
    """Test precision and recall calculation."""
    evaluator = BasicIREvaluator()
    
    retrieved = ["a", "b", "c", "d", "e"]
    ground_truth = ["b", "d", "f", "g"]
    
    # 2 relevant retrieved out of 5 total retrieved
    precision = evaluator._calculate_precision(retrieved, ground_truth)
    assert precision == 0.4  # 2/5
    
    # 2 relevant retrieved out of 4 total relevant
    recall = evaluator._calculate_recall(retrieved, ground_truth)
    assert recall == 0.5  # 2/4
    
    # F1 score
    f1 = evaluator._calculate_f1(precision, recall)
    assert f1 == pytest.approx(0.444, rel=0.01)  # 2 * 0.4 * 0.5 / (0.4 + 0.5)

def test_ndcg_calculation():
    """Test NDCG calculation."""
    evaluator = BasicIREvaluator()
    
    # Perfect ranking
    retrieved = ["a", "b", "c"]
    ground_truth = ["a", "b", "c"]
    assert evaluator._calculate_ndcg(retrieved, ground_truth, k=3) == 1.0
    
    # Worst ranking (relevant items at bottom)
    retrieved = ["d", "e", "a"]
    ground_truth = ["a", "b", "c"]
    ndcg = evaluator._calculate_ndcg(retrieved, ground_truth, k=3)
    assert 0 < ndcg < 0.5  # Should be low but not zero

def test_diversity_calculation():
    """Test diversity calculation."""
    evaluator = BasicIREvaluator()
    
    # Mock chunks with embeddings
    from app.models.chunk import Chunk
    
    chunks = [
        Chunk(id="1", embedding=[1.0, 0.0, 0.0]),
        Chunk(id="2", embedding=[0.0, 1.0, 0.0]),
        Chunk(id="3", embedding=[0.0, 0.0, 1.0])
    ]
    
    diversity = evaluator._calculate_diversity(chunks)
    assert diversity == 1.0  # Orthogonal vectors = maximum diversity
    
    # Identical embeddings
    chunks_identical = [
        Chunk(id="1", embedding=[1.0, 0.0, 0.0]),
        Chunk(id="2", embedding=[1.0, 0.0, 0.0])
    ]
    
    diversity_identical = evaluator._calculate_diversity(chunks_identical)
    assert diversity_identical == 0.0  # Identical = no diversity
```

```python
# tests/test_llm_evaluator.py

import pytest
from unittest.mock import AsyncMock, MagicMock
from app.core.evaluation.llm_evaluator import LLMJudgeEvaluator

@pytest.mark.asyncio
async def test_llm_evaluate():
    """Test LLM evaluation."""
    evaluator = LLMJudgeEvaluator(api_key="test-key")
    
    # Mock OpenAI response
    evaluator.client.chat.completions.create = AsyncMock(return_value=MagicMock(
        choices=[MagicMock(
            message=MagicMock(
                content='{"score": 4, "reasoning": "Highly relevant", "key_points": ["point1"]}'
            )
        )],
        usage=MagicMock(
            prompt_tokens=100,
            completion_tokens=50,
            total_tokens=150
        )
    ))
    
    from app.models.chunk import Chunk
    chunks = [Chunk(id="1", content="Test chunk")]
    
    result = await evaluator.evaluate(
        query_text="Test query",
        chunks=chunks,
        model="gpt-3.5-turbo"
    )
    
    assert result["llm_avg_score"] == 4
    assert result["llm_chunk_scores"] == [4]
    assert result["llm_eval_cost_usd"] > 0

def test_cost_estimation():
    """Test cost estimation."""
    cost = LLMJudgeEvaluator.estimate_cost(
        num_queries=10,
        chunks_per_query=5,
        model="gpt-3.5-turbo"
    )
    
    assert cost > 0
    assert cost < 1.0  # Should be cents, not dollars
```

### 8.2 Integration Tests

```python
# tests/integration/test_experiment_evaluation.py

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.experiment_service import ExperimentService
from app.models import Project, Document, Config, Query, Experiment

@pytest.mark.asyncio
async def test_experiment_with_basic_metrics(db: AsyncSession):
    """Test experiment with basic metrics only."""
    # Create test data
    project = Project(name="Test Project")
    db.add(project)
    await db.commit()
    
    # Create config without LLM judge
    config = Config(
        project_id=project.id,
        name="Test Config",
        chunk_strategy="fixed",
        chunk_size=512,
        embedding_model="text-embedding-ada-002",
        retrieval_strategy="dense",
        evaluation_settings={"use_llm_judge": False}
    )
    db.add(config)
    
    # Create query with ground truth
    query = Query(
        project_id=project.id,
        query_text="What is the product?",
        ground_truth_chunk_ids=["chunk-1", "chunk-2"]
    )
    db.add(query)
    await db.commit()
    
    # Create experiment
    service = ExperimentService(db)
    experiment = await service.create_experiment(
        project_id=project.id,
        experiment_data={
            "config_ids": [config.id],
            "query_ids": [query.id]
        }
    )
    
    # Verify results have basic metrics
    results = await service.get_experiment_results(experiment.id)
    
    assert "basic" in results["configs"][0]["results"][0]["metrics"]
    assert "llm_judge" not in results["configs"][0]["results"][0]["metrics"]
    assert results["total_cost_usd"] == 0.0

@pytest.mark.asyncio
async def test_experiment_with_llm_judge(db: AsyncSession):
    """Test experiment with LLM judge enabled."""
    # Similar setup but with use_llm_judge: true
    config = Config(
        ...
        evaluation_settings={
            "use_llm_judge": True,
            "llm_judge_model": "gpt-3.5-turbo"
        }
    )
    
    # Run experiment
    ...
    
    # Verify LLM metrics present
    results = await service.get_experiment_results(experiment.id)
    
    assert "llm_judge" in results["configs"][0]["results"][0]["metrics"]
    assert results["total_cost_usd"] > 0
```

### 8.3 Frontend Tests

```tsx
// tests/MetricsDisplay.test.tsx

import { render, screen } from '@testing-library/react'
import MetricsDisplay from '@/components/MetricsDisplay'

describe('MetricsDisplay', () => {
  it('renders basic metrics correctly', () => {
    const metrics = {
      basic: {
        mrr: 0.75,
        'ndcg@5': 0.68,
        'precision@5': 0.80,
        'recall@5': 0.85,
        'f1@5': 0.82,
        diversity: 0.82
      }
    }
    
    render(
      <MetricsDisplay
        configName="Test Config"
        metrics={metrics}
        rank={1}
        isWinner={true}
      />
    )
    
    expect(screen.getByText('0.750')).toBeInTheDocument() // MRR
    expect(screen.getByText('0.680')).toBeInTheDocument() // NDCG
    expect(screen.getByText('80%')).toBeInTheDocument() // Precision
  })
  
  it('displays winner badge for top config', () => {
    render(
      <MetricsDisplay
        configName="Winner"
        metrics={{}}
        rank={1}
        isWinner={true}
      />
    )
    
    expect(screen.getByText('🏆 Winner')).toBeInTheDocument()
  })
  
  it('shows LLM judge metrics when available', () => {
    const metrics = {
      llm_judge: {
        llm_avg_score: 4.2,
        llm_eval_cost_usd: 0.05
      }
    }
    
    render(
      <MetricsDisplay
        configName="Test"
        metrics={metrics}
        rank={1}
        isWinner={false}
      />
    )
    
    expect(screen.getByText('4.20/5')).toBeInTheDocument()
    expect(screen.getByText('$0.0500')).toBeInTheDocument()
  })
})
```

---

## 9. Implementation Timeline

### Week 1: Foundation & Basic Metrics

**Days 1-2: Database & Models**
- ✅ Create migration for metrics columns
- ✅ Update SQLAlchemy models
- ✅ Update Pydantic schemas
- ✅ Test database changes

**Days 3-5: Basic Evaluator**
- ✅ Implement `BasicIREvaluator` class
- ✅ Implement all IR metrics (MRR, NDCG, P@K, R@K, F1, diversity)
- ✅ Write unit tests
- ✅ Integration with experiment service

**Days 6-7: Frontend - Basic Display**
- ✅ Update results components
- ✅ Add metric tooltips
- ✅ Test UI changes

**Deliverable:** Experiments show basic IR metrics

---

### Week 2: LLM Judge Integration

**Days 1-3: LLM Evaluator**
- ✅ Implement `LLMJudgeEvaluator` class
- ✅ Cost calculation
- ✅ Error handling
- ✅ Unit tests

**Days 4-5: Integration**
- ✅ Update experiment service
- ✅ Add cost estimation endpoint
- ✅ Integration tests

**Days 6-7: Frontend - LLM Settings**
- ✅ Config evaluation settings component
- ✅ Cost estimator component
- ✅ Enhanced metrics display

**Deliverable:** LLM judge evaluation works end-to-end

---

### Week 3: RAGAS & Polish

**Days 1-3: RAGAS Integration**
- ✅ Install RAGAS dependencies
- ✅ Implement `RAGASEvaluator` class
- ✅ LangChain LLM setup
- ✅ Tests

**Days 4-5: Polish & Documentation**
- ✅ Update API docs
- ✅ Write user guide
- ✅ Add example queries with ground truth
- ✅ Performance optimization

**Days 6-7: Testing & Bug Fixes**
- ✅ End-to-end testing
- ✅ Bug fixes
- ✅ Performance tuning

**Deliverable:** Complete evaluation system v1.0

---

### Week 4+ (Optional): Advanced Features

- Ground truth management UI
- Metric comparison charts
- Export evaluation reports
- Custom metric plugins
- Batch evaluation API

---

## 10. Success Metrics

### Technical Success

- ✅ All basic IR metrics calculated correctly
- ✅ LLM judge evaluation < 2s per query
- ✅ RAGAS evaluation < 5s per query
- ✅ Cost estimation accurate within 10%
- ✅ Zero breaking changes to existing API

### User Success

- ✅ Users can understand metric meanings (tooltips)
- ✅ Users can make informed config decisions
- ✅ Users know exact cost before running
- ✅ Results clearly show winner and why

### Business Success

- ✅ 80% of experiments use new metrics
- ✅ <5% cost-related support tickets
- ✅ Users report "better decisions" in feedback
- ✅ No complaints about pricing transparency

---

## Appendix A: Metric Glossary

### Mean Reciprocal Rank (MRR)
**Formula:** `1 / rank_of_first_relevant_item`  
**Range:** 0-1 (higher is better)  
**Use case:** When you care about the position of the FIRST correct result  
**Example:**
- First relevant at position 1 → MRR = 1.0
- First relevant at position 3 → MRR = 0.33

### NDCG@K (Normalized Discounted Cumulative Gain)
**Formula:** `DCG / IDCG`  
**Range:** 0-1 (higher is better)  
**Use case:** When ranking quality matters (position affects value)  
**Example:**
- Perfect ranking → NDCG = 1.0
- All relevant at bottom → NDCG ≈ 0.3

### Precision@K
**Formula:** `relevant_items_retrieved / k`  
**Range:** 0-1 (higher is better)  
**Use case:** "Of my top K results, how many are relevant?"  
**Example:**
- Top 5 has 4 relevant → P@5 = 0.8

### Recall@K
**Formula:** `relevant_items_retrieved / total_relevant_items`  
**Range:** 0-1 (higher is better)  
**Use case:** "Did I find all the relevant items?"  
**Example:**
- Found 3 out of 5 relevant → R@5 = 0.6

### F1@K
**Formula:** `2 * (P * R) / (P + R)`  
**Range:** 0-1 (higher is better)  
**Use case:** Balance between precision and recall  
**Example:**
- P=0.8, R=0.6 → F1 = 0.686

### Diversity
**Formula:** `1 - avg_pairwise_similarity`  
**Range:** 0-1 (higher is better)  
**Use case:** Avoid redundant/duplicate results  
**Example:**
- All chunks identical → Diversity = 0
- All chunks different → Diversity = 1

---

## Appendix B: Migration Guide

### For Existing Deployments

```bash
# 1. Backup database
docker-compose exec postgres pg_dump -U ragstudio ragstudio > backup.sql

# 2. Pull latest code
git pull origin main

# 3. Run migrations
docker-compose exec backend alembic upgrade head

# 4. Restart services
docker-compose restart backend frontend

# 5. Verify
curl http://localhost:8000/health
```

### Backward Compatibility

All existing experiments will continue to work:
- Old results without metrics will show "N/A"
- New metrics are additive, not breaking
- API responses include both old and new fields
- Frontend gracefully handles missing metrics

### Data Migration (Optional)

To backfill metrics for old experiments:

```python
# scripts/backfill_metrics.py

from app.database import AsyncSessionLocal
from app.models import Result
from app.core.evaluation.evaluator import EvaluationService

async def backfill_metrics():
    async with AsyncSessionLocal() as db:
        # Get all results without metrics
        results = await db.execute(
            select(Result).where(Result.metrics == None)
        )
        
        evaluator = EvaluationService()
        
        for result in results.scalars():
            # Re-calculate basic metrics
            metrics = evaluator.basic_evaluator.evaluate(...)
            result.metrics = {"basic": metrics}
        
        await db.commit()

# Run with: python scripts/backfill_metrics.py
```

---

## Appendix C: FAQ

**Q: Do I need an OpenAI API key for basic metrics?**  
A: No! Basic IR metrics (MRR, NDCG, etc.) work without any API calls.

**Q: How much does LLM judge cost?**  
A: ~$0.01 per query with GPT-3.5, ~$0.05 with GPT-4. Cost shown before running.

**Q: What if I don't have ground truth?**  
A: Use LLM judge! It evaluates relevance without ground truth.

**Q: Can I use local LLMs for evaluation?**  
A: Not yet. Phase 4 will add local LLM support (Ollama, etc.)

**Q: Which metric should I optimize for?**  
A:
- Have ground truth? → NDCG@5 or F1@5
- No ground truth? → LLM judge avg score
- Care about diversity? → Diversity metric
- First result critical? → MRR

**Q: How do I add custom metrics?**  
A: Create a custom evaluator class implementing the same interface. See `BasicIREvaluator` as template.

---

**End of Specification**

Ready for implementation! 🚀