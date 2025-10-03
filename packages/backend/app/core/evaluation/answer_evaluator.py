"""Answer quality evaluation using LLM-as-Judge."""

import json
from typing import List, Dict, Any
from openai import AsyncOpenAI

from app.models.chunk import Chunk


class AnswerQualityEvaluator:
    """Evaluate generated answers for quality, faithfulness, and relevance."""

    # Cost per 1K tokens
    COST_PER_1K_INPUT_TOKENS = 0.00015  # gpt-4o-mini
    COST_PER_1K_OUTPUT_TOKENS = 0.0006

    def __init__(self, api_key: str):
        """Initialize with OpenAI API key."""
        self.client = AsyncOpenAI(api_key=api_key)

    async def evaluate(
        self,
        query_text: str,
        generated_answer: str,
        chunks: List[Chunk],
        model: str = "gpt-4o-mini"
    ) -> Dict[str, Any]:
        """
        Evaluate answer quality comprehensively.

        Args:
            query_text: The original question
            generated_answer: The AI-generated answer
            chunks: The chunks used as context
            model: OpenAI model for evaluation

        Returns:
            Dictionary with metrics and detailed evaluation
        """
        # Build context from chunks
        context = self._build_context(chunks)

        # Build evaluation prompt
        prompt = self._build_evaluation_prompt(
            query=query_text,
            answer=generated_answer,
            context=context
        )

        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert evaluator for RAG (Retrieval-Augmented Generation) systems. Evaluate answers objectively and provide structured feedback."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.0,
                max_tokens=800
            )

            # Parse evaluation
            result = json.loads(response.choices[0].message.content)

            # Calculate cost
            usage = response.usage
            cost_usd = (
                (usage.prompt_tokens / 1000) * self.COST_PER_1K_INPUT_TOKENS +
                (usage.completion_tokens / 1000) * self.COST_PER_1K_OUTPUT_TOKENS
            )

            # Extract metrics
            metrics = {
                "faithfulness": result.get("faithfulness", 0.0),
                "answer_relevance": result.get("answer_relevance", 0.0),
                "completeness": result.get("completeness", 0.0),
                "conciseness": result.get("conciseness", 0.0),
                "overall_quality": result.get("overall_quality", 0.0),

                # Detailed breakdown
                "hallucinations": result.get("hallucinations", []),
                "hallucination_count": len(result.get("hallucinations", [])),
                "has_hallucinations": len(result.get("hallucinations", [])) > 0,

                "supported_claims": result.get("supported_claims", []),
                "unsupported_claims": result.get("unsupported_claims", []),

                "reasoning": result.get("reasoning", ""),
                "strengths": result.get("strengths", []),
                "weaknesses": result.get("weaknesses", []),

                # Metadata
                "evaluation_model": model,
                "evaluation_cost_usd": round(cost_usd, 6),
                "tokens_used": usage.total_tokens,
            }

            return metrics

        except Exception as e:
            return {
                "faithfulness": 0.0,
                "answer_relevance": 0.0,
                "completeness": 0.0,
                "conciseness": 0.0,
                "overall_quality": 0.0,
                "hallucinations": [],
                "hallucination_count": 0,
                "has_hallucinations": False,
                "supported_claims": [],
                "unsupported_claims": [],
                "reasoning": f"Error during evaluation: {str(e)}",
                "strengths": [],
                "weaknesses": [],
                "error": str(e),
                "evaluation_cost_usd": 0.0,
                "tokens_used": 0,
            }

    def _build_context(self, chunks: List[Chunk]) -> str:
        """Build formatted context from chunks."""
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            context_parts.append(f"[Chunk {i}]")
            context_parts.append(chunk.content)
            context_parts.append("")
        return "\n".join(context_parts)

    def _build_evaluation_prompt(
        self,
        query: str,
        answer: str,
        context: str
    ) -> str:
        """Build comprehensive evaluation prompt."""
        return f"""Evaluate this RAG-generated answer on multiple dimensions.

**Query:** "{query}"

**Context (Retrieved Chunks):**
{context}

**Generated Answer:**
"{answer}"

---

Evaluate the answer on these criteria (0.0 to 1.0 scale):

1. **Faithfulness**: Does the answer contain ONLY information from the context?
   - 1.0 = Everything in the answer comes from context
   - 0.0 = Answer contains made-up information

2. **Answer Relevance**: How well does it answer the question?
   - 1.0 = Perfectly answers the question
   - 0.0 = Doesn't answer the question at all

3. **Completeness**: Does it cover all important aspects?
   - 1.0 = Covers all relevant information from context
   - 0.0 = Missing important information

4. **Conciseness**: Is it appropriately concise?
   - 1.0 = Concise without losing important info
   - 0.0 = Too verbose or too brief

5. **Overall Quality**: Overall answer quality
   - Average of the above metrics

**Hallucination Detection:**
- Identify ANY statements in the answer that are NOT supported by the context
- For each hallucination, provide the text and explain why it's not supported

Respond in JSON format:
{{
  "faithfulness": <0.0-1.0>,
  "answer_relevance": <0.0-1.0>,
  "completeness": <0.0-1.0>,
  "conciseness": <0.0-1.0>,
  "overall_quality": <0.0-1.0>,

  "hallucinations": [
    {{
      "text": "<hallucinated text from answer>",
      "reason": "<why this is not in context>"
    }}
  ],

  "supported_claims": [
    {{
      "claim": "<claim from answer>",
      "source": "<which chunk supports it>"
    }}
  ],

  "unsupported_claims": [
    "<claim not in context>"
  ],

  "reasoning": "<brief explanation of scores>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"]
}}

Be thorough and objective. Hallucinations are critical - flag ANY information not in the context."""

    @staticmethod
    def get_summary_score(metrics: Dict[str, Any]) -> float:
        """
        Get single summary score for answer quality.

        Penalizes hallucinations heavily.
        """
        if not metrics:
            return 0.0

        base_score = metrics.get("overall_quality", 0.0)

        # Heavy penalty for hallucinations
        hallucination_count = metrics.get("hallucination_count", 0)
        if hallucination_count > 0:
            # Each hallucination reduces score by 0.2 (up to 1.0 total penalty)
            penalty = min(hallucination_count * 0.2, 1.0)
            base_score = max(0.0, base_score - penalty)

        return round(base_score, 3)
