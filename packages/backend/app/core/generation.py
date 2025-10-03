"""Answer generation service for RAG pipeline."""

from typing import List, Dict, Any
from openai import AsyncOpenAI

from app.models.chunk import Chunk


# Default prompt template
DEFAULT_PROMPT_TEMPLATE = """You are a helpful assistant. Answer the question based ONLY on the provided context.

If the context doesn't contain enough information to answer the question, say "I don't have enough information to answer this question based on the provided context."

Context:
{context}

Question: {question}

Instructions:
- Answer based ONLY on the context above
- Do not add information that is not in the context
- Be concise and accurate
- If you reference specific information, you can mention which part of the context it comes from

Answer:"""


class AnswerGenerationService:
    """Service for generating answers from retrieved chunks."""

    # Pricing per 1K tokens (OpenAI GPT-4o pricing as of 2024)
    PRICING = {
        "gpt-4o": {"input": 0.0025, "output": 0.01},
        "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
        "gpt-4-turbo": {"input": 0.01, "output": 0.03},
        "gpt-3.5-turbo": {"input": 0.0015, "output": 0.002},
    }

    def __init__(self, api_key: str):
        """Initialize with OpenAI API key."""
        self.client = AsyncOpenAI(api_key=api_key)

    async def generate_answer(
        self,
        query_text: str,
        chunks: List[Chunk],
        model: str = "gpt-4o-mini",
        temperature: float = 0.0,
        max_tokens: int = 500,
        prompt_template: str | None = None,
    ) -> Dict[str, Any]:
        """
        Generate answer from retrieved chunks.

        Args:
            query_text: The user's question
            chunks: Retrieved chunks to use as context
            model: OpenAI model to use
            temperature: Temperature for generation (0 = deterministic)
            max_tokens: Maximum tokens to generate
            prompt_template: Custom prompt template (uses default if None)

        Returns:
            Dictionary with:
            - answer: Generated answer text
            - model: Model used
            - tokens_used: Total tokens used
            - cost_usd: Cost in USD
            - chunks_used: Number of chunks used
        """
        # Build context from chunks
        context = self._build_context(chunks)

        # Build prompt
        template = prompt_template or DEFAULT_PROMPT_TEMPLATE
        prompt = template.format(
            context=context,
            question=query_text,
            top_k=len(chunks)
        )

        try:
            # Generate answer
            response = await self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )

            answer = response.choices[0].message.content or ""

            # Calculate cost
            usage = response.usage
            cost_usd = self._calculate_cost(
                model=model,
                input_tokens=usage.prompt_tokens,
                output_tokens=usage.completion_tokens
            )

            return {
                "answer": answer.strip(),
                "model": model,
                "tokens_used": usage.total_tokens,
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "cost_usd": cost_usd,
                "chunks_used": len(chunks),
                "temperature": temperature,
                "prompt_sent": prompt,  # Full prompt sent to LLM
            }

        except Exception as e:
            return {
                "answer": f"Error generating answer: {str(e)}",
                "model": model,
                "tokens_used": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "cost_usd": 0.0,
                "chunks_used": len(chunks),
                "error": str(e),
            }

    def _build_context(self, chunks: List[Chunk]) -> str:
        """
        Build context string from chunks.

        Format:
        ---
        Chunk 1:
        [content]

        ---
        Chunk 2:
        [content]
        ...
        """
        context_parts = []

        for i, chunk in enumerate(chunks, 1):
            context_parts.append(f"--- Chunk {i} ---")
            context_parts.append(chunk.content)
            context_parts.append("")  # Empty line between chunks

        return "\n".join(context_parts)

    def _calculate_cost(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int
    ) -> float:
        """Calculate cost in USD based on token usage."""
        pricing = self.PRICING.get(model, self.PRICING["gpt-4o-mini"])

        input_cost = (input_tokens / 1000) * pricing["input"]
        output_cost = (output_tokens / 1000) * pricing["output"]

        return round(input_cost + output_cost, 6)

    @staticmethod
    def get_default_template() -> str:
        """Get the default prompt template."""
        return DEFAULT_PROMPT_TEMPLATE

    @staticmethod
    def get_default_generation_settings() -> Dict[str, Any]:
        """Get default generation settings for a config."""
        return {
            "enabled": False,  # Opt-in to avoid unexpected costs
            "model": "gpt-4o-mini",
            "temperature": 0.0,
            "max_tokens": 500,
        }
