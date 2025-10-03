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
{chunk[:1000]}
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
