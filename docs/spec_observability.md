# RAG Studio Observability & Complete RAG Testing - Implementation Specification

**Version:** 2.0
**Date:** 2025-10-03
**Status:** Approved for Implementation

---

## 🎯 Executive Summary

### Current State
RAG Studio V1 is a **retrieval optimizer** with strong evaluation metrics but limited visibility into:
- HOW documents are chunked
- WHY certain results are ranked higher
- WHAT the complete RAG pipeline (retrieval → answer) produces
- HOW to quickly experiment with parameter variations

**Severity Assessment:**
- Visualization: 2/10 ❌ Critical
- Debugging: 1/10 ❌ Critical
- Answer Generation: 0/10 ❌ Blocker
- Real-time Experimentation: 4/10 ⚠️ Major

### Target State
Transform into a **complete RAG testing platform** with:
- ✅ Full pipeline visibility (chunk → retrieval → ranking → answer)
- ✅ Interactive debugging and trace analysis
- ✅ Answer quality evaluation (hallucination, citation, relevance)
- ✅ Fast experimentation with query-time parameters
- ✅ Advanced analytics (clustering, coverage, semantic analysis)

---

## 📊 Feature Priority Matrix

| Priority | Feature | Impact | Effort | Ratio |
|----------|---------|--------|--------|-------|
| **P0** | Chunk Visualizer | 🔴 Critical | Medium | 🔥 High |
| **P0** | Answer Generation | 🔴 Critical | Large | 🔥 High |
| **P0** | Trace/Debug View | 🔴 Critical | Large | 🔥 High |
| **P0** | Query-time Parameters | 🔴 Critical | Small | 🔥 Very High |
| **P1** | False Negative Analysis | 🟡 Major | Medium | ⭐ Good |
| **P1** | Result Versioning | 🟡 Major | Medium | ⭐ Good |
| **P1** | Export/Import | 🟡 Major | Small | ⭐ Very Good |
| **P1** | Semantic Clustering | 🟡 Major | Large | 🟢 Moderate |
| **P2** | Custom Evaluators | 🟢 Nice | Large | 🟢 Low |
| **P2** | Query Augmentation | 🟢 Nice | Large | 🟢 Low |

---

## 🔴 P0 Feature #1: Chunk Visualizer

### Problem Statement
**Current:** Users are blind to chunking. They see "512 tokens, 50 overlap" but don't understand:
- Where exactly are chunk boundaries in their documents?
- Are chunks splitting mid-sentence or mid-word?
- How does overlap actually work in practice?
- Are chunks semantically coherent or arbitrary cuts?

**Impact:** Users can't optimize chunking because they can't see what's happening.

### Solution Overview
Interactive document viewer with visual chunk boundaries, overlap highlighting, and metadata display.

### User Stories
```gherkin
As a RAG engineer
I want to see how my document is split into chunks
So that I can understand if my chunking strategy makes sense

Given a document "medical_paper.pdf"
When I view it in the Chunk Visualizer
Then I should see the document text with colored boundaries between chunks
And I should be able to hover over a chunk to see metadata
And I should be able to click a chunk to highlight it across all views
```

### Technical Architecture

#### Backend Changes

##### 1. New API Endpoint
```python
@router.get("/configs/{config_id}/documents/{document_id}/chunks/visualization")
async def get_chunk_visualization(
    config_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db)
) -> ChunkVisualizationResponse:
    """
    Returns document with chunk boundary positions.

    Response includes:
    - Full document text
    - Array of chunk positions (start, end, metadata)
    - Overlap regions
    - Chunk statistics
    """
```

##### 2. Response Schema
```python
class ChunkBoundary(BaseModel):
    chunk_id: UUID
    start_pos: int  # Character position in document
    end_pos: int
    chunk_index: int
    content_preview: str  # First 100 chars
    token_count: int
    metadata: dict

class OverlapRegion(BaseModel):
    chunk_a_id: UUID
    chunk_b_id: UUID
    start_pos: int
    end_pos: int
    overlap_text: str

class ChunkVisualizationResponse(BaseModel):
    document_id: UUID
    document_filename: str
    full_text: str
    total_length: int
    chunks: list[ChunkBoundary]
    overlaps: list[OverlapRegion]
    statistics: dict  # avg size, gaps, etc.
```

##### 3. Service Logic
```python
async def build_chunk_visualization(
    document: Document,
    config: Config,
    db: AsyncSession
) -> ChunkVisualizationResponse:
    """
    1. Get all chunks for config+document (ordered by chunk_index)
    2. Find each chunk's position in original document text
    3. Detect overlaps between consecutive chunks
    4. Calculate statistics
    """
    # Algorithm: Use fuzzy text matching to find chunk positions
    # since we don't store original positions
```

#### Frontend Changes

##### 1. New Component: ChunkVisualizer
```typescript
interface ChunkVisualizerProps {
  configId: string
  documentId: string
}

// Features:
// - Virtualized scrolling for large documents
// - Color-coded chunks (alternating colors)
// - Hover tooltips with metadata
// - Click to highlight chunk
// - Overlap regions shown with gradient
// - Sidebar with chunk list
// - Search/filter chunks
```

##### 2. Visual Design
```
┌─────────────────────────────────────────────┐
│ Document: medical_paper.pdf                 │
│ Config: Balanced Default (512 tokens)       │
├──────────────────────┬──────────────────────┤
│ Document Text        │ Chunk List           │
│                      │                      │
│ [Chunk 0 - Blue]     │ ☑ Chunk 0           │
│ Lorem ipsum dolor    │   512 tokens        │
│ sit amet...          │   Position: 0-2048  │
│ [Overlap - Gradient] │                      │
│ [Chunk 1 - Green]    │ ☑ Chunk 1           │
│ consectetur adipisc  │   510 tokens        │
│ ing elit...          │   Position: 1998-... │
│                      │                      │
└──────────────────────┴──────────────────────┘
```

##### 3. Interaction Patterns
- **Hover chunk:** Show tooltip with metadata
- **Click chunk:** Highlight in document + scroll to in list
- **Click in list:** Scroll to chunk in document
- **Toggle overlaps:** Show/hide overlap regions
- **Export view:** Download annotated document

##### 4. Navigation
Add to ConfigsPage:
```typescript
<Button onClick={() => navigate(`/configs/${id}/visualizer`)}>
  Visualize Chunks
</Button>
```

New route: `/projects/:projectId/configs/:configId/visualizer`

#### Database Impact
**None** - Uses existing chunk data.

**Performance Note:** For large documents (100+ chunks), response may be slow. Consider:
- Pagination (show chunks 1-50, then load more)
- Caching visualization data
- Background job to pre-compute positions

#### Implementation Phases

##### Phase 1: Basic Visualization (1 week)
- [ ] Backend endpoint with chunk boundaries
- [ ] Frontend component with color-coded chunks
- [ ] Hover tooltips
- [ ] Basic statistics

##### Phase 2: Advanced Features (1 week)
- [ ] Overlap visualization
- [ ] Click interactions
- [ ] Chunk list sidebar
- [ ] Search/filter

##### Phase 3: Performance & Polish (3 days)
- [ ] Virtualized scrolling for large docs
- [ ] Caching
- [ ] Export functionality
- [ ] Mobile responsive

#### Testing Strategy
```python
# Backend Tests
def test_chunk_visualization_positions():
    """Ensure chunk positions are correctly calculated"""

def test_overlap_detection():
    """Verify overlaps are correctly identified"""

# Frontend Tests
test('renders chunks with correct boundaries', ...)
test('highlights chunk on click', ...)
test('shows overlap regions', ...)
```

#### Success Metrics
- ✅ Users can see chunk boundaries within 2 seconds
- ✅ 90%+ accuracy in position detection
- ✅ Handles documents up to 50,000 words
- ✅ Zero UI lag on hover/click

---

## 🔴 P0 Feature #2: Answer Generation Pipeline

### Problem Statement
**Current:** RAG Studio only tests **retrieval**. But in production, RAG = Retrieval + Generation:
```
Query → [Retrieve Chunks] → Feed to LLM → Generate Answer
```

**Missing Evaluation:**
- Is the generated answer correct?
- Does it hallucinate (make up facts)?
- Does it cite the correct chunks?
- Is the answer relevant even if chunks are relevant?

**Impact:** 50% of RAG quality story is invisible. A config might retrieve good chunks but produce bad answers.

### Solution Overview
Add optional answer generation step with comprehensive answer quality evaluation.

### User Stories
```gherkin
As a RAG engineer
I want to test the complete RAG pipeline including answer generation
So that I can evaluate end-to-end quality, not just retrieval

Given an experiment with "generate_answers: true"
When the experiment runs
Then for each query, the system should:
  1. Retrieve chunks (existing)
  2. Pass chunks + query to LLM
  3. Generate an answer
  4. Evaluate answer quality (relevance, hallucination, citations)
  5. Store answer with evaluation metrics
```

### Technical Architecture

#### Backend Changes

##### 1. Database Schema - New Table: Answers
```sql
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    result_id UUID REFERENCES results(id) ON DELETE CASCADE,
    generated_text TEXT NOT NULL,
    model VARCHAR(100) NOT NULL,  -- gpt-3.5-turbo, gpt-4, etc.
    prompt_template VARCHAR(50),  -- "default", "chat", "concise"
    generation_tokens INTEGER,
    generation_cost_usd NUMERIC(10, 6),

    -- Answer Evaluation Metrics
    answer_metrics JSONB,  -- Structured metrics

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_answers_result_id ON answers(result_id);
CREATE INDEX idx_answers_metrics ON answers USING gin(answer_metrics);
```

##### 2. Answer Metrics Schema
```python
class AnswerMetrics(BaseModel):
    # Relevance (how well does answer address query?)
    relevance_score: float  # 0-1, LLM judge or RAGAS

    # Faithfulness (does answer stick to retrieved chunks?)
    faithfulness_score: float  # 0-1
    hallucination_count: int  # Number of unsupported claims

    # Citation Quality
    citation_accuracy: float  # 0-1, correct chunks cited?
    chunks_cited: list[UUID]  # Which chunks were referenced
    chunks_unused: list[UUID]  # Retrieved but not used

    # Answer Characteristics
    answer_length: int  # characters
    completeness: float  # 0-1, does it fully answer?
    clarity: float  # 0-1, is it well-written?
```

##### 3. Config Changes - Add Answer Settings
```python
class Config(Base):
    # ... existing fields ...

    # New: Answer generation settings
    answer_generation_enabled: Mapped[bool] = mapped_column(default=False)
    answer_generation_settings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # {
    #   "model": "gpt-3.5-turbo",
    #   "prompt_template": "default",
    #   "max_tokens": 500,
    #   "temperature": 0.7
    # }
```

##### 4. New Service: AnswerGenerationService
```python
class AnswerGenerationService:
    def __init__(self, openai_api_key: str):
        self.client = AsyncOpenAI(api_key=openai_api_key)

    async def generate_answer(
        self,
        query: str,
        retrieved_chunks: list[Chunk],
        settings: dict
    ) -> GeneratedAnswer:
        """
        Generate answer using retrieved chunks as context.

        Process:
        1. Build prompt with query + chunks
        2. Call OpenAI API
        3. Parse response
        4. Track tokens and cost
        """
        prompt = self._build_prompt(query, retrieved_chunks, settings)

        response = await self.client.chat.completions.create(
            model=settings.get("model", "gpt-3.5-turbo"),
            messages=[
                {"role": "system", "content": "You are a helpful assistant..."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=settings.get("max_tokens", 500),
            temperature=settings.get("temperature", 0.7)
        )

        return GeneratedAnswer(
            text=response.choices[0].message.content,
            tokens=response.usage.total_tokens,
            cost=self._calculate_cost(...)
        )

    async def evaluate_answer(
        self,
        query: str,
        answer: str,
        retrieved_chunks: list[Chunk],
        ground_truth: str | None = None
    ) -> AnswerMetrics:
        """
        Evaluate answer quality using multiple methods.

        Evaluations:
        1. Relevance (does it answer the query?)
        2. Faithfulness (is it supported by chunks?)
        3. Citation accuracy (correct sources?)
        4. Hallucination detection
        5. Completeness & clarity
        """
        # Run evaluations in parallel
        relevance = await self._evaluate_relevance(query, answer, ground_truth)
        faithfulness = await self._evaluate_faithfulness(answer, retrieved_chunks)
        citations = await self._evaluate_citations(answer, retrieved_chunks)

        return AnswerMetrics(...)

    def _build_prompt(self, query: str, chunks: list[Chunk], settings: dict) -> str:
        """Build prompt based on template."""
        template = settings.get("prompt_template", "default")

        if template == "default":
            return f"""Answer the following question using only the provided context.

Context:
{self._format_chunks(chunks)}

Question: {query}

Answer:"""

        elif template == "chat":
            # Conversational style
            ...

        elif template == "concise":
            # Brief answers only
            ...

    async def _evaluate_relevance(self, query: str, answer: str, ground_truth: str | None) -> float:
        """
        Use LLM to judge answer relevance to query.
        If ground_truth provided, also compare semantic similarity.
        """
        prompt = f"""Rate how well this answer addresses the query (1-5):

Query: {query}
Answer: {answer}

Rating (1=poor, 5=excellent):"""

        # ... call LLM, parse score ...

    async def _evaluate_faithfulness(self, answer: str, chunks: list[Chunk]) -> dict:
        """
        Check if answer contains claims not supported by chunks.
        Returns faithfulness score + list of hallucinations.
        """
        # Use NLI model or LLM to check entailment
        # For each sentence in answer, verify it's supported by chunks
        ...

    async def _evaluate_citations(self, answer: str, chunks: list[Chunk]) -> dict:
        """
        Detect which chunks were actually used in the answer.
        Check if citations are accurate.
        """
        # Use embedding similarity to match answer sentences to chunks
        # Or use LLM to identify which chunks support which claims
        ...
```

##### 5. Experiment Service Integration
```python
async def _run_experiment(self, experiment: Experiment) -> None:
    # ... existing retrieval code ...

    # NEW: If config has answer generation enabled
    if config.answer_generation_enabled:
        answer_service = AnswerGenerationService(api_key)

        # Generate answer
        generated_answer = await answer_service.generate_answer(
            query=query.query_text,
            retrieved_chunks=chunks,
            settings=config.answer_generation_settings
        )

        # Evaluate answer
        answer_metrics = await answer_service.evaluate_answer(
            query=query.query_text,
            answer=generated_answer.text,
            retrieved_chunks=chunks,
            ground_truth=query.ground_truth
        )

        # Store answer
        answer = Answer(
            result_id=result.id,
            generated_text=generated_answer.text,
            model=config.answer_generation_settings["model"],
            generation_tokens=generated_answer.tokens,
            generation_cost_usd=generated_answer.cost,
            answer_metrics=answer_metrics.dict()
        )
        self.db.add(answer)
```

##### 6. API Endpoints
```python
# Get answer for a result
@router.get("/results/{result_id}/answer")
async def get_result_answer(result_id: UUID, db: AsyncSession) -> AnswerResponse:
    """Returns generated answer with evaluation metrics."""

# Compare answers across configs
@router.get("/experiments/{experiment_id}/answers/comparison")
async def compare_experiment_answers(experiment_id: UUID, query_id: UUID, db: AsyncSession):
    """Side-by-side comparison of answers from different configs."""
```

#### Frontend Changes

##### 1. Config Form - Add Answer Generation Section
```typescript
<Collapsible>
  <CollapsibleTrigger>
    Answer Generation (Optional)
  </CollapsibleTrigger>
  <CollapsibleContent>
    <Switch
      checked={formData.answer_generation_enabled}
      onCheckedChange={(enabled) => setFormData({...formData, answer_generation_enabled: enabled})}
    />

    {formData.answer_generation_enabled && (
      <>
        <Select label="Model">
          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast, $0.002/query)</SelectItem>
          <SelectItem value="gpt-4">GPT-4 (Best, $0.06/query)</SelectItem>
          <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Balanced, $0.01/query)</SelectItem>
        </Select>

        <Select label="Prompt Template">
          <SelectItem value="default">Default (Detailed)</SelectItem>
          <SelectItem value="concise">Concise (Brief answers)</SelectItem>
          <SelectItem value="chat">Conversational</SelectItem>
        </Select>

        <Input
          type="number"
          label="Max Answer Length (tokens)"
          value={formData.answer_generation_settings?.max_tokens || 500}
        />
      </>
    )}
  </CollapsibleContent>
</Collapsible>
```

##### 2. Cost Estimator Update
```typescript
// Update to include answer generation costs
const estimateAnswerCost = (
  numQueries: number,
  configs: Config[],
  avgChunkLength: number
) => {
  const configsWithAnswers = configs.filter(c => c.answer_generation_enabled)

  return configsWithAnswers.reduce((total, config) => {
    const model = config.answer_generation_settings?.model || "gpt-3.5-turbo"
    const inputTokens = avgChunkLength * config.top_k  // context
    const outputTokens = config.answer_generation_settings?.max_tokens || 500

    const costPerQuery = calculateModelCost(model, inputTokens, outputTokens)
    return total + (costPerQuery * numQueries)
  }, 0)
}

// Show in modal:
// "Answer Generation: $X.XX"
// "Total: $Y.YY"
```

##### 3. Results Display - Show Answers
```typescript
<Card>
  <CardHeader>
    <CardTitle>Generated Answer</CardTitle>
    <Badge>{answer.model}</Badge>
    <Badge variant="outline">${answer.generation_cost_usd.toFixed(4)}</Badge>
  </CardHeader>
  <CardContent>
    <div className="prose">
      {answer.generated_text}
    </div>

    <Separator className="my-4" />

    <h4>Answer Quality Metrics</h4>
    <div className="grid grid-cols-2 gap-4">
      <MetricCard
        label="Relevance"
        value={answer.answer_metrics.relevance_score}
        description="How well does it answer the query?"
      />
      <MetricCard
        label="Faithfulness"
        value={answer.answer_metrics.faithfulness_score}
        description="Is it supported by chunks?"
        warning={answer.answer_metrics.hallucination_count > 0}
      />
      <MetricCard
        label="Citation Accuracy"
        value={answer.answer_metrics.citation_accuracy}
        description="Correct sources cited?"
      />
    </div>

    {answer.answer_metrics.hallucination_count > 0 && (
      <Alert variant="destructive">
        <AlertTitle>⚠️ Potential Hallucinations Detected</AlertTitle>
        <AlertDescription>
          This answer contains {answer.answer_metrics.hallucination_count} claim(s)
          that may not be supported by the retrieved chunks.
        </AlertDescription>
      </Alert>
    )}

    <Collapsible>
      <CollapsibleTrigger>Show Citations</CollapsibleTrigger>
      <CollapsibleContent>
        <h5>Chunks Cited:</h5>
        {answer.answer_metrics.chunks_cited.map(chunkId => (
          <ChunkPreview key={chunkId} chunkId={chunkId} highlighted />
        ))}

        <h5>Chunks Not Used:</h5>
        {answer.answer_metrics.chunks_unused.map(chunkId => (
          <ChunkPreview key={chunkId} chunkId={chunkId} dimmed />
        ))}
      </CollapsibleContent>
    </Collapsible>
  </CardContent>
</Card>
```

##### 4. Answer Comparison View
```typescript
// New page: /experiments/:id/answers/compare?query=:queryId

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {configs.map(config => (
    <Card key={config.id}>
      <CardHeader>
        <CardTitle>{config.name}</CardTitle>
        <div className="flex gap-2">
          <Badge>Score: {result.answer_metrics.relevance_score.toFixed(2)}</Badge>
          <Badge variant={result.answer_metrics.hallucination_count > 0 ? "destructive" : "success"}>
            {result.answer_metrics.hallucination_count > 0 ? "Has Hallucinations" : "Faithful"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p>{answer.generated_text}</p>
      </CardContent>
    </Card>
  ))}
</div>
```

#### Implementation Phases

##### Phase 1: Basic Answer Generation (2 weeks)
- [ ] Database schema (answers table)
- [ ] AnswerGenerationService with basic prompts
- [ ] Experiment integration
- [ ] Frontend form to enable answer generation
- [ ] Display answers in results

##### Phase 2: Answer Evaluation (2 weeks)
- [ ] Relevance scoring
- [ ] Faithfulness/hallucination detection
- [ ] Citation tracking
- [ ] Metrics display in UI
- [ ] Warning alerts for hallucinations

##### Phase 3: Advanced Features (1 week)
- [ ] Multiple prompt templates
- [ ] Answer comparison view
- [ ] Cost tracking and display
- [ ] Export answers

#### Testing Strategy
```python
# Backend Tests
def test_answer_generation():
    """Ensure answers are generated correctly"""

def test_hallucination_detection():
    """Verify hallucinations are caught"""

def test_citation_accuracy():
    """Check citation tracking works"""

# Integration Tests
def test_full_rag_pipeline():
    """End-to-end: query → retrieve → generate → evaluate"""
```

#### Success Metrics
- ✅ Answers generated in <5 seconds
- ✅ Hallucination detection 80%+ accuracy
- ✅ Citation tracking 90%+ accuracy
- ✅ Cost estimates within 10% of actual

---

## 🔴 P0 Feature #3: Trace/Debug View

### Problem Statement
**Current:** Results show final scores but no insight into HOW they were computed:
- Why is chunk A ranked higher than chunk B?
- What was the actual similarity score for each step?
- Did BM25 find different chunks than dense search?
- How did RRF combine the results?

**Impact:** Users can't debug or improve configs because the process is a black box.

### Solution Overview
Step-by-step execution trace showing every stage of retrieval and ranking with intermediate values.

### User Stories
```gherkin
As a RAG engineer debugging poor results
I want to see a detailed trace of the retrieval process
So that I can identify where things went wrong

Given a result with low score
When I click "View Trace"
Then I should see:
  1. Query preprocessing (embedding generated)
  2. Dense search results with similarity scores
  3. BM25 search results with BM25 scores
  4. RRF fusion process with weights
  5. Final ranking with scores
  6. Evaluation metrics calculation
```

### Technical Architecture

#### Backend Changes

##### 1. Database Schema - New Table: Traces
```sql
CREATE TABLE execution_traces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    result_id UUID REFERENCES results(id) ON DELETE CASCADE,

    -- Trace data stored as JSONB for flexibility
    trace_data JSONB NOT NULL,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_traces_result_id ON execution_traces(result_id);
```

##### 2. Trace Data Schema
```python
class ExecutionTrace(BaseModel):
    """Complete trace of retrieval + evaluation process."""

    # Step 1: Query Processing
    query_processing: QueryProcessingTrace

    # Step 2: Retrieval
    retrieval_trace: RetrievalTrace

    # Step 3: Ranking
    ranking_trace: RankingTrace

    # Step 4: Evaluation
    evaluation_trace: EvaluationTrace

    # Timing
    step_timings: dict[str, float]  # milliseconds per step

class QueryProcessingTrace(BaseModel):
    original_query: str
    preprocessed_query: str | None  # If any cleaning applied
    embedding_generated: bool
    embedding_model: str | None
    embedding_dimensions: int | None
    embedding_time_ms: float

class RetrievalTrace(BaseModel):
    strategy: str  # "dense", "bm25", "hybrid"

    # Dense search (if applicable)
    dense_search: DenseSearchTrace | None

    # BM25 search (if applicable)
    bm25_search: BM25SearchTrace | None

    # Hybrid fusion (if applicable)
    fusion_trace: FusionTrace | None

class DenseSearchTrace(BaseModel):
    search_time_ms: float
    total_chunks_searched: int
    results: list[DenseSearchResult]

class DenseSearchResult(BaseModel):
    chunk_id: UUID
    rank: int
    cosine_distance: float  # Raw distance from pgvector
    cosine_similarity: float  # 1 - distance
    chunk_preview: str  # First 200 chars

class BM25SearchTrace(BaseModel):
    search_time_ms: float
    query_terms: list[str]  # After stemming
    total_chunks_searched: int
    results: list[BM25SearchResult]

class BM25SearchResult(BaseModel):
    chunk_id: UUID
    rank: int
    ts_rank_score: float  # PostgreSQL ts_rank_cd value
    matched_terms: list[str]  # Which query terms matched
    chunk_preview: str

class FusionTrace(BaseModel):
    """Reciprocal Rank Fusion trace."""
    method: str  # "RRF"
    dense_weight: float
    sparse_weight: float
    rrf_k: int  # Constant (usually 60)

    # Show scoring for each chunk
    chunk_scores: list[ChunkFusionScore]

class ChunkFusionScore(BaseModel):
    chunk_id: UUID
    dense_rank: int | None  # Position in dense results (None if not found)
    dense_score: float  # weight / (k + rank)
    bm25_rank: int | None
    bm25_score: float
    final_rrf_score: float  # Sum of dense + bm25
    final_rank: int

class RankingTrace(BaseModel):
    """Final ranking after fusion/filtering."""
    final_ranking: list[FinalRankedChunk]
    top_k_selected: int
    total_candidates: int

class FinalRankedChunk(BaseModel):
    chunk_id: UUID
    final_rank: int
    final_score: float
    chunk_content: str  # Full content
    why_ranked_here: str  # Explanation

class EvaluationTrace(BaseModel):
    """Trace of evaluation metrics calculation."""

    # Ground truth matching
    ground_truth_matching: GroundTruthMatchTrace | None

    # Basic IR metrics
    ir_metrics_calc: dict  # Show how each metric was calculated

    # LLM judge (if applicable)
    llm_judge_trace: LLMJudgeTrace | None

class GroundTruthMatchTrace(BaseModel):
    method: str  # "text_similarity" or "chunk_ids"
    ground_truth_provided: str | list[UUID]
    relevant_chunks: list[UUID]
    matching_details: dict  # How similarity was calculated

class LLMJudgeTrace(BaseModel):
    model: str
    per_chunk_evaluations: list[ChunkLLMEvaluation]
    aggregation: dict  # How avg/max/min calculated
```

##### 3. Service Changes - Add Tracing
```python
class RetrievalService:
    async def search_dense(
        self,
        query_embedding: list[float],
        config_id: UUID,
        top_k: int = 5,
        trace: bool = False  # NEW parameter
    ) -> tuple[list[Chunk], DenseSearchTrace | None]:
        """
        If trace=True, return both results AND trace data.
        """
        start_time = time.time()

        # Execute search
        query = (
            select(Chunk)
            .where(Chunk.config_id == config_id)
            .where(cast(Chunk.chunk_metadata["embedding_dim"].astext, Integer) == len(query_embedding))
            .order_by(Chunk.embedding.cosine_distance(query_embedding))
            .limit(top_k)
        )

        result = await self.db.execute(query)
        chunks = list(result.scalars().all())

        if not trace:
            return chunks, None

        # Build trace
        trace_data = DenseSearchTrace(
            search_time_ms=(time.time() - start_time) * 1000,
            total_chunks_searched=await self._count_chunks(config_id),
            results=[
                DenseSearchResult(
                    chunk_id=chunk.id,
                    rank=i+1,
                    cosine_distance=self._calculate_distance(query_embedding, chunk.embedding),
                    cosine_similarity=1 - self._calculate_distance(query_embedding, chunk.embedding),
                    chunk_preview=chunk.content[:200]
                )
                for i, chunk in enumerate(chunks)
            ]
        )

        return chunks, trace_data
```

##### 4. Experiment Service - Collect Traces
```python
async def _run_experiment(self, experiment: Experiment) -> None:
    for config in configs:
        for query in queries:
            # Start timing
            step_timings = {}

            # Step 1: Query processing
            start = time.time()
            query_embedding = await embedding_service.embed_single(...)
            step_timings["query_processing"] = (time.time() - start) * 1000

            # Step 2: Retrieval WITH TRACING
            start = time.time()
            if config.retrieval_strategy == "dense":
                chunks, dense_trace = await retrieval_service.search_dense(
                    query_embedding=query_embedding,
                    config_id=config.id,
                    top_k=config.top_k,
                    trace=True  # Enable tracing
                )
                retrieval_trace = RetrievalTrace(
                    strategy="dense",
                    dense_search=dense_trace
                )
            # ... similar for bm25 and hybrid ...

            step_timings["retrieval"] = (time.time() - start) * 1000

            # Step 3: Evaluation WITH TRACING
            # ... collect evaluation trace ...

            # Build complete trace
            execution_trace = ExecutionTrace(
                query_processing=QueryProcessingTrace(...),
                retrieval_trace=retrieval_trace,
                ranking_trace=RankingTrace(...),
                evaluation_trace=EvaluationTrace(...),
                step_timings=step_timings
            )

            # Store trace
            trace = ExecutionTrace(
                result_id=result.id,
                trace_data=execution_trace.dict()
            )
            self.db.add(trace)
```

##### 5. API Endpoints
```python
@router.get("/results/{result_id}/trace")
async def get_result_trace(result_id: UUID, db: AsyncSession) -> ExecutionTrace:
    """Returns detailed execution trace for a result."""

@router.get("/results/{result_id}/trace/compare")
async def compare_result_traces(
    result_id_a: UUID,
    result_id_b: UUID,
    db: AsyncSession
) -> TraceComparisonResponse:
    """Side-by-side comparison of two traces."""
```

#### Frontend Changes

##### 1. New Component: TraceViewer
```typescript
interface TraceViewerProps {
  resultId: string
}

// Design: Vertical stepper showing each stage
// Each step expandable with details
```

##### 2. Visual Design
```
┌─────────────────────────────────────────────┐
│ Execution Trace                             │
│ Result: Config A × Query 1                  │
├─────────────────────────────────────────────┤
│                                             │
│ ✓ 1. Query Processing          12ms        │
│   ├─ Original: "What are flu symptoms?"    │
│   ├─ Embedding: text-embedding-3-small     │
│   └─ Dimensions: 1536                      │
│                                             │
│ ✓ 2. Dense Search              45ms        │
│   ├─ Searched: 247 chunks                  │
│   └─ Results:                              │
│       [Expand to see similarity scores]    │
│                                             │
│ ✓ 3. BM25 Search               18ms        │
│   ├─ Query terms: flu, symptom             │
│   ├─ Searched: 247 chunks                  │
│   └─ Results:                              │
│       [Expand to see BM25 scores]          │
│                                             │
│ ✓ 4. RRF Fusion                5ms         │
│   ├─ Dense weight: 0.5                     │
│   ├─ BM25 weight: 0.5                      │
│   └─ Fusion details:                       │
│       [Expand to see score calculation]    │
│                                             │
│ ✓ 5. Final Ranking             2ms         │
│   Top 5 of 15 candidates                   │
│   [Expand to see ranked list]              │
│                                             │
│ ✓ 6. Evaluation                120ms       │
│   ├─ Ground truth matching                 │
│   ├─ IR metrics (NDCG, MRR, etc.)         │
│   └─ LLM judge evaluation                  │
│                                             │
│ Total: 202ms                                │
└─────────────────────────────────────────────┘
```

##### 3. Expandable Sections
```typescript
// Example: Dense Search Results
<Collapsible>
  <CollapsibleTrigger>
    ✓ 2. Dense Search (45ms)
  </CollapsibleTrigger>
  <CollapsibleContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rank</TableHead>
          <TableHead>Chunk ID</TableHead>
          <TableHead>Similarity</TableHead>
          <TableHead>Preview</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trace.retrieval_trace.dense_search.results.map(result => (
          <TableRow key={result.chunk_id}>
            <TableCell>{result.rank}</TableCell>
            <TableCell className="font-mono text-xs">
              {result.chunk_id.substring(0, 8)}...
            </TableCell>
            <TableCell>
              <Badge variant={result.cosine_similarity > 0.8 ? "success" : "default"}>
                {result.cosine_similarity.toFixed(3)}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {result.chunk_preview}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CollapsibleContent>
</Collapsible>
```

##### 4. RRF Fusion Visualization
```typescript
// Show how each chunk was scored
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Chunk</TableHead>
      <TableHead>Dense Rank</TableHead>
      <TableHead>Dense Score</TableHead>
      <TableHead>BM25 Rank</TableHead>
      <TableHead>BM25 Score</TableHead>
      <TableHead>RRF Score</TableHead>
      <TableHead>Final Rank</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {trace.retrieval_trace.fusion_trace.chunk_scores.map(score => (
      <TableRow key={score.chunk_id}>
        <TableCell className="font-mono text-xs">
          {score.chunk_id.substring(0, 8)}...
        </TableCell>
        <TableCell>{score.dense_rank ?? "—"}</TableCell>
        <TableCell>{score.dense_score.toFixed(4)}</TableCell>
        <TableCell>{score.bm25_rank ?? "—"}</TableCell>
        <TableCell>{score.bm25_score.toFixed(4)}</TableCell>
        <TableCell>
          <Badge>{score.final_rrf_score.toFixed(4)}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{score.final_rank}</Badge>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>

// Formula explanation
<Alert>
  <AlertTitle>RRF Scoring Formula</AlertTitle>
  <AlertDescription>
    <code>
      RRF_score = (dense_weight / (60 + dense_rank)) + (bm25_weight / (60 + bm25_rank))
    </code>
  </AlertDescription>
</Alert>
```

##### 5. Navigation
Add to ExperimentResultsPage:
```typescript
<Button variant="outline" onClick={() => setShowTrace(true)}>
  🔍 View Trace
</Button>

<Dialog open={showTrace} onOpenChange={setShowTrace}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <TraceViewer resultId={result.id} />
  </DialogContent>
</Dialog>
```

#### Implementation Phases

##### Phase 1: Basic Trace Collection (1 week)
- [ ] Database schema
- [ ] Service modifications to collect traces
- [ ] API endpoint
- [ ] Store traces during experiments

##### Phase 2: Trace Viewer UI (2 weeks)
- [ ] TraceViewer component with stepper
- [ ] Expandable sections
- [ ] Dense/BM25/Hybrid trace displays
- [ ] Timing visualization

##### Phase 3: Advanced Features (1 week)
- [ ] Trace comparison (side-by-side)
- [ ] Highlight differences between traces
- [ ] Export trace as JSON
- [ ] Search/filter within trace

#### Testing Strategy
```python
# Backend Tests
def test_trace_collection():
    """Ensure traces are collected correctly"""

def test_trace_accuracy():
    """Verify traced values match actual execution"""

# Frontend Tests
test('renders trace steps', ...)
test('expands sections on click', ...)
test('shows timing correctly', ...)
```

#### Success Metrics
- ✅ Traces captured for 100% of results
- ✅ Trace load time <1 second
- ✅ All intermediate values accurate
- ✅ Users can identify bottlenecks from timing

---

## 🔴 P0 Feature #4: Query-time Parameter Override

### Problem Statement
**Current:** To test parameter variations, you must:
1. Create new config with different top_k/weights
2. Wait ~5 minutes for chunk processing
3. Run experiment
4. Repeat for each variation

**Impact:** Extremely slow iteration. Testing "top_k: 5 vs 10" takes 10+ minutes.

**Reality:** Many parameters don't require re-processing:
- ✅ `top_k` - Just return more results
- ✅ `dense_weight` / `sparse_weight` - Re-run RRF with different weights
- ✅ `reranking` - Post-process results
- ❌ `chunk_size` / `embedding_model` - Requires re-processing

### Solution Overview
Allow overriding retrieval parameters at query time without creating new configs.

### User Stories
```gherkin
As a RAG engineer optimizing retrieval
I want to test different top_k values instantly
So that I can find the optimal value without waiting

Given a config "Balanced Default"
When I run a query with override {"top_k": 10}
Then the system should use the existing chunks/embeddings
And retrieve 10 results instead of 5
And show me updated metrics immediately
```

### Technical Architecture

#### Backend Changes

##### 1. New API Endpoint
```python
@router.post("/experiments/query-time")
async def run_query_time_experiment(
    request: QueryTimeExperimentRequest,
    db: AsyncSession = Depends(get_db)
) -> QueryTimeExperimentResponse:
    """
    Run instant retrieval with parameter overrides.

    No config creation, no chunk processing.
    Uses existing chunks, applies overrides at retrieval time.
    """
```

##### 2. Request/Response Schemas
```python
class QueryTimeExperimentRequest(BaseModel):
    config_id: UUID  # Base config to use
    query_id: UUID  # Or query_text: str for ad-hoc queries

    # Overridable parameters
    overrides: QueryTimeOverrides

class QueryTimeOverrides(BaseModel):
    # Retrieval parameters
    top_k: int | None = None  # Override config.top_k
    dense_weight: float | None = None  # Override hybrid weights
    sparse_weight: float | None = None

    # Future: Reranking
    rerank: bool = False
    rerank_model: str | None = None

class QueryTimeExperimentResponse(BaseModel):
    # Same structure as regular Result, but not stored
    retrieved_chunks: list[ChunkResponse]
    score: float
    latency_ms: int
    metrics: dict

    # Show what was overridden
    effective_params: dict  # Merged config + overrides

    # Optional: trace
    trace: ExecutionTrace | None
```

##### 3. Service Implementation
```python
class ExperimentService:
    async def run_query_time_experiment(
        self,
        config: Config,
        query: Query,
        overrides: QueryTimeOverrides
    ) -> QueryTimeExperimentResponse:
        """
        Run retrieval with parameter overrides.

        Process:
        1. Load base config
        2. Apply overrides
        3. Run retrieval (uses existing chunks)
        4. Evaluate
        5. Return results (don't store)
        """
        # Merge config + overrides
        effective_top_k = overrides.top_k or config.top_k
        effective_dense_weight = overrides.dense_weight or 0.5
        effective_sparse_weight = overrides.sparse_weight or 0.5

        # Generate query embedding (if needed)
        if config.retrieval_strategy in ("dense", "hybrid"):
            query_embedding = await embedding_service.embed_single(
                text=query.query_text,
                model=config.embedding_model
            )

        # Run retrieval with overrides
        if config.retrieval_strategy == "dense":
            chunks = await retrieval_service.search_dense(
                query_embedding=query_embedding,
                config_id=config.id,
                top_k=effective_top_k  # OVERRIDE
            )
        elif config.retrieval_strategy == "hybrid":
            chunks = await retrieval_service.search_hybrid(
                query_embedding=query_embedding,
                query_text=query.query_text,
                config_id=config.id,
                top_k=effective_top_k,  # OVERRIDE
                dense_weight=effective_dense_weight,  # OVERRIDE
                sparse_weight=effective_sparse_weight  # OVERRIDE
            )

        # Evaluate (same as regular experiments)
        evaluation_result = await evaluation_service.evaluate_retrieval(
            query=query,
            retrieved_chunks=chunks,
            config=config,
            top_k=effective_top_k
        )

        return QueryTimeExperimentResponse(
            retrieved_chunks=[...],
            score=evaluation_result["primary_score"],
            metrics=evaluation_result["metrics"],
            effective_params={
                "top_k": effective_top_k,
                "dense_weight": effective_dense_weight,
                "sparse_weight": effective_sparse_weight
            }
        )
```

#### Frontend Changes

##### 1. New Component: QueryTimeExperimenter
```typescript
// Live testing interface with sliders
interface QueryTimeExperimenterProps {
  configId: string
}

// Features:
// - Select query from dropdown or enter custom
// - Sliders for top_k, dense_weight, sparse_weight
// - "Run" button (instant, <1 second)
// - Results shown immediately
// - Compare multiple runs side-by-side
```

##### 2. Visual Design
```
┌────────────────────────────────────────────────┐
│ Query-Time Experimenter                        │
│ Config: Balanced Hybrid                        │
├────────────────────────────────────────────────┤
│                                                │
│ Query: [Dropdown: Select or type query...]    │
│                                                │
│ Parameters:                                    │
│   Top K:          [====●=====] 10             │
│   Dense Weight:   [===●======] 0.6            │
│   Sparse Weight:  [======●===] 0.4            │
│                                                │
│   [Run Query]  [Add to Comparison]             │
│                                                │
├────────────────────────────────────────────────┤
│ Results (234ms):                               │
│                                                │
│   Primary Score: 0.82  ⬆ +0.05 vs base        │
│   NDCG@10: 0.78                               │
│   Chunks Retrieved: 10                         │
│                                                │
│   [View Trace]  [Save as Config]              │
│                                                │
├────────────────────────────────────────────────┤
│ Comparison (3 runs):                           │
│                                                │
│ ┌───────┬────────┬───────────┬───────┐       │
│ │ Run   │ top_k  │ d_weight  │ Score │       │
│ ├───────┼────────┼───────────┼───────┤       │
│ │ Base  │ 5      │ 0.5       │ 0.77  │       │
│ │ Run 1 │ 10     │ 0.5       │ 0.80  │ ⬆    │
│ │ Run 2 │ 10     │ 0.6       │ 0.82  │ ⬆⬆   │
│ └───────┴────────┴───────────┴───────┘       │
│                                                │
│ [Export Comparison]                            │
└────────────────────────────────────────────────┘
```

##### 3. Implementation
```typescript
const [params, setParams] = useState({
  top_k: config.top_k,
  dense_weight: 0.5,
  sparse_weight: 0.5
})

const [runs, setRuns] = useState<QueryTimeResult[]>([])

const runQuery = async () => {
  const result = await api.post('/experiments/query-time', {
    config_id: configId,
    query_id: selectedQueryId,
    overrides: params
  })

  setRuns([...runs, result])
}

// Render sliders
<Slider
  value={[params.top_k]}
  onValueChange={([value]) => setParams({...params, top_k: value})}
  min={1}
  max={20}
  step={1}
/>

// Show delta from base config
{result.score > config.base_score && (
  <Badge variant="success">
    ⬆ +{(result.score - config.base_score).toFixed(2)}
  </Badge>
)}
```

##### 4. Navigation
Add to ConfigsPage:
```typescript
<Button onClick={() => navigate(`/configs/${id}/experiment`)}>
  ⚡ Quick Test
</Button>
```

New route: `/projects/:projectId/configs/:configId/experiment`

#### Implementation Phases

##### Phase 1: Basic Override System (1 week)
- [ ] API endpoint
- [ ] Service logic for parameter merging
- [ ] Frontend component with sliders
- [ ] Basic results display

##### Phase 2: Comparison & Polish (3 days)
- [ ] Multiple run comparison
- [ ] Delta visualization
- [ ] Export comparison table
- [ ] "Save as Config" button

##### Phase 3: Advanced Overrides (1 week)
- [ ] Reranking support
- [ ] Custom scoring functions
- [ ] Batch testing (try multiple values)

#### Testing Strategy
```python
# Backend Tests
def test_parameter_override():
    """Ensure overrides are applied correctly"""

def test_no_config_creation():
    """Verify no new config/chunks created"""

# Frontend Tests
test('slider updates parameters', ...)
test('shows results immediately', ...)
test('compares multiple runs', ...)
```

#### Success Metrics
- ✅ Query-time experiments complete in <1 second
- ✅ No config/chunk creation
- ✅ Users can test 10+ variations in 1 minute
- ✅ Results identical to full experiment (for same params)

---

## 🟡 P1 Feature #5: False Negative Analysis

### Problem Statement
**Current:** You see which chunks WERE retrieved, but not which chunks SHOULD have been retrieved but weren't.

**Example:**
- Query: "What are side effects of aspirin?"
- Retrieved: Chunks 3, 7, 12, 18, 25
- Ground truth: Chunks 3, 7, 12, **22**, **31**

**Missing:** System doesn't highlight that chunks 22 and 31 are relevant but weren't retrieved. This is CRITICAL for improving retrieval.

### Solution Overview
Analyze ground truth to identify false negatives (relevant but not retrieved), show why they were missed, and suggest fixes.

### Technical Architecture

##### 1. API Endpoint
```python
@router.get("/results/{result_id}/false-negatives")
async def analyze_false_negatives(result_id: UUID) -> FalseNegativeAnalysis:
    """
    Identify chunks that should have been retrieved but weren't.
    Analyze WHY they were missed.
    """
```

##### 2. Analysis Schema
```python
class FalseNegativeAnalysis(BaseModel):
    result_id: UUID
    query_text: str

    # False negatives
    missed_chunks: list[MissedChunk]

    # Analysis
    total_relevant: int
    retrieved_relevant: int
    missed_relevant: int
    recall: float

    # Suggestions
    suggestions: list[str]

class MissedChunk(BaseModel):
    chunk_id: UUID
    chunk_content: str
    rank_in_corpus: int  # Where it ranked (e.g., 23rd)
    should_be_rank: int  # Where it should be (e.g., 3rd)

    # Why missed
    similarity_to_query: float
    bm25_score: float | None

    # Possible reasons
    reasons: list[str]  # ["Low embedding similarity", "No keyword match", etc.]

class ImprovementSuggestion(BaseModel):
    type: str  # "increase_top_k", "adjust_weights", "add_hybrid", etc.
    description: str
    estimated_impact: float  # How much recall would improve
```

##### 3. Analysis Logic
```python
async def analyze_false_negatives(
    result: Result,
    query: Query,
    config: Config
) -> FalseNegativeAnalysis:
    """
    Process:
    1. Get ground truth relevant chunks
    2. Compare with retrieved chunks
    3. Identify missed chunks
    4. For each missed chunk:
       - Calculate similarity scores
       - Determine rank in full corpus
       - Identify why it was missed
    5. Generate improvement suggestions
    """
    # Get ground truth
    relevant_chunks = await get_relevant_chunks(query)
    retrieved_chunk_ids = result.retrieved_chunk_ids

    # Find false negatives
    missed_chunk_ids = set(relevant_chunks) - set(retrieved_chunk_ids)

    # Analyze each missed chunk
    missed_chunks = []
    for chunk_id in missed_chunk_ids:
        chunk = await db.get(Chunk, chunk_id)

        # Calculate scores
        similarity = calculate_similarity(query_embedding, chunk.embedding)
        bm25_score = calculate_bm25_score(query_text, chunk.content)

        # Find rank
        all_results = await search_all(query, config, top_k=1000)
        rank = next(i for i, c in enumerate(all_results) if c.id == chunk_id)

        # Determine reasons
        reasons = []
        if similarity < 0.7:
            reasons.append("Low embedding similarity")
        if bm25_score < 2.0:
            reasons.append("No strong keyword match")
        if rank > 50:
            reasons.append("Ranked very low (beyond top 50)")

        missed_chunks.append(MissedChunk(
            chunk_id=chunk_id,
            chunk_content=chunk.content,
            rank_in_corpus=rank,
            should_be_rank=relevant_chunks.index(chunk_id) + 1,
            similarity_to_query=similarity,
            bm25_score=bm25_score,
            reasons=reasons
        ))

    # Generate suggestions
    suggestions = generate_suggestions(missed_chunks, config)

    return FalseNegativeAnalysis(...)
```

##### 4. Suggestion Generator
```python
def generate_suggestions(
    missed_chunks: list[MissedChunk],
    config: Config
) -> list[str]:
    """
    Analyze patterns in missed chunks to suggest improvements.
    """
    suggestions = []

    # If many missed chunks have low ranks
    avg_rank = np.mean([c.rank_in_corpus for c in missed_chunks])
    if avg_rank > config.top_k + 5:
        suggestions.append(
            f"Increase top_k to {int(avg_rank + 2)} to capture more relevant chunks"
        )

    # If missed chunks have good BM25 but bad embedding similarity
    if any(c.bm25_score > 3.0 and c.similarity_to_query < 0.7 for c in missed_chunks):
        if config.retrieval_strategy == "dense":
            suggestions.append(
                "Switch to 'hybrid' retrieval - missed chunks have strong keyword matches"
            )

    # If missed chunks have good embedding but bad BM25
    if any(c.similarity_to_query > 0.75 and c.bm25_score < 2.0 for c in missed_chunks):
        if config.retrieval_strategy == "bm25":
            suggestions.append(
                "Switch to 'hybrid' or 'dense' - missed chunks are semantically relevant"
            )

    # If using hybrid, suggest weight adjustments
    if config.retrieval_strategy == "hybrid":
        # Analyze which search method would have found the missed chunks
        dense_would_find = sum(1 for c in missed_chunks if c.similarity_to_query > 0.75)
        bm25_would_find = sum(1 for c in missed_chunks if c.bm25_score > 3.0)

        if dense_would_find > bm25_would_find:
            suggestions.append(
                f"Increase dense_weight to 0.7 - semantic search would find {dense_would_find} missed chunks"
            )
        elif bm25_would_find > dense_would_find:
            suggestions.append(
                f"Increase sparse_weight to 0.7 - keyword search would find {bm25_would_find} missed chunks"
            )

    return suggestions
```

#### Frontend Changes

##### 1. UI Component
```typescript
<Card>
  <CardHeader>
    <CardTitle>False Negative Analysis</CardTitle>
    <CardDescription>
      {analysis.missed_relevant} relevant chunks were not retrieved
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Alert variant="warning">
      <AlertTitle>Recall: {(analysis.recall * 100).toFixed(1)}%</AlertTitle>
      <AlertDescription>
        You found {analysis.retrieved_relevant} of {analysis.total_relevant} relevant chunks.
        {analysis.missed_relevant} chunks were missed.
      </AlertDescription>
    </Alert>

    <Separator className="my-4" />

    <h4>Missed Chunks:</h4>
    {analysis.missed_chunks.map(chunk => (
      <Card key={chunk.chunk_id} className="mb-2 border-l-4 border-l-yellow-500">
        <CardContent className="pt-4">
          <div className="flex justify-between">
            <div>
              <Badge>Ranked #{chunk.rank_in_corpus}</Badge>
              <Badge variant="outline">Should be #{chunk.should_be_rank}</Badge>
            </div>
            <div>
              <Badge>Similarity: {chunk.similarity_to_query.toFixed(2)}</Badge>
              {chunk.bm25_score && (
                <Badge>BM25: {chunk.bm25_score.toFixed(2)}</Badge>
              )}
            </div>
          </div>

          <p className="text-sm mt-2">{chunk.chunk_content.substring(0, 200)}...</p>

          <div className="mt-2">
            <strong>Why missed:</strong>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              {chunk.reasons.map(reason => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    ))}

    <Separator className="my-4" />

    <h4>💡 Suggestions to Improve Recall:</h4>
    <ul className="list-disc list-inside space-y-2">
      {analysis.suggestions.map((suggestion, i) => (
        <li key={i} className="text-sm">
          {suggestion}
          <Button size="sm" variant="link">
            Apply This
          </Button>
        </li>
      ))}
    </ul>
  </CardContent>
</Card>
```

##### 2. Quick Apply
```typescript
// When user clicks "Apply This" on a suggestion
const applySuggestion = (suggestion: string) => {
  if (suggestion.includes("Increase top_k")) {
    const newTopK = extractNumberFromSuggestion(suggestion)
    // Open query-time experimenter with new top_k
    navigate(`/configs/${configId}/experiment?top_k=${newTopK}`)
  } else if (suggestion.includes("Switch to 'hybrid'")) {
    // Prompt to create new config with hybrid
    openCreateConfigModal({ ...currentConfig, retrieval_strategy: "hybrid" })
  }
  // ... etc
}
```

#### Implementation: 1 week

---

## 🟡 P1 Feature #6: Result Versioning

### Problem Statement
**Current:** If you run the same experiment twice, you can't compare today's results with yesterday's. No history, no trend analysis, no regression detection.

### Solution Overview
Track experiment history, enable result comparison over time, detect regressions.

### Technical Architecture

##### 1. Database Schema Changes
```sql
-- Add version tracking to experiments
ALTER TABLE experiments ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE experiments ADD COLUMN parent_experiment_id UUID REFERENCES experiments(id);

-- Track experiment metadata for comparison
CREATE TABLE experiment_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID REFERENCES experiments(id),
    snapshot_date DATE NOT NULL,

    -- Aggregated metrics
    avg_score_across_configs FLOAT,
    avg_latency_ms INTEGER,
    total_cost_usd NUMERIC(10, 4),

    -- Summary stats
    best_config_id UUID,
    worst_config_id UUID,
    config_count INTEGER,
    query_count INTEGER,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_snapshots_experiment_id ON experiment_snapshots(experiment_id);
CREATE INDEX idx_snapshots_date ON experiment_snapshots(snapshot_date);
```

##### 2. API Endpoints
```python
@router.get("/experiments/{experiment_id}/history")
async def get_experiment_history(experiment_id: UUID) -> ExperimentHistoryResponse:
    """Returns all versions of an experiment with trend data."""

@router.post("/experiments/{experiment_id}/re-run")
async def re_run_experiment(experiment_id: UUID) -> Experiment:
    """Re-run experiment with same configs/queries, create new version."""

@router.get("/experiments/compare")
async def compare_experiments(experiment_ids: list[UUID]) -> ExperimentComparisonResponse:
    """Side-by-side comparison of multiple experiment runs."""
```

##### 3. Frontend Components
- **History Timeline:** Line chart showing score trends over time
- **Regression Alerts:** Highlight if performance dropped
- **Version Comparison:** Table comparing metrics across versions

#### Implementation: 1 week

---

## 🟡 P1 Feature #7: Export/Import System

### Problem Statement
**Current:** Data is trapped in RAG Studio. No way to:
- Export results for external analysis (Excel, Python)
- Export embeddings for visualization (t-SNE)
- Import benchmark datasets
- Share experiments with team

### Solution Overview
Comprehensive export/import with multiple formats.

### Supported Exports

##### 1. Results Export (CSV/JSON)
```python
@router.get("/experiments/{experiment_id}/export")
async def export_experiment_results(
    experiment_id: UUID,
    format: str = "csv"  # or "json"
) -> FileResponse:
    """
    Exports:
    - All results (config, query, score, latency, metrics)
    - Chunk content for each result
    - Evaluation metrics in columns
    """
```

CSV Structure:
```csv
config_name,query_text,score,ndcg,mrr,precision,recall,f1,latency_ms,chunks_retrieved
Balanced Default,"What are flu symptoms?",0.82,0.78,1.0,0.8,0.6,0.69,45,"chunk1,chunk2,..."
Quality Large,"What are flu symptoms?",0.85,0.81,1.0,1.0,0.6,0.75,78,"chunk3,chunk1,..."
```

##### 2. Embeddings Export (NPY/JSON)
```python
@router.get("/configs/{config_id}/embeddings/export")
async def export_embeddings(config_id: UUID, format: str = "npy") -> FileResponse:
    """
    Exports all embeddings for visualization.
    Useful for t-SNE, UMAP, etc.

    Format:
    - npy: NumPy array (N x D)
    - json: {chunk_id: [embedding], ...}
    """
```

##### 3. Chunks Export (JSON/CSV)
```python
@router.get("/configs/{config_id}/chunks/export")
async def export_chunks(config_id: UUID) -> FileResponse:
    """
    Exports all chunks with metadata.
    Useful for manual inspection.
    """
```

### Supported Imports

##### 1. Benchmark Dataset Import
```python
@router.post("/projects/{project_id}/import/benchmark")
async def import_benchmark_dataset(
    project_id: UUID,
    dataset: UploadFile,
    format: str = "beir"  # or "custom"
):
    """
    Import standard benchmark datasets:
    - BEIR format
    - MTEB format
    - Custom JSON

    Creates:
    - Documents from corpus
    - Queries from qrels
    - Ground truth from relevance judgments
    """
```

##### 2. Query Set Import
```python
@router.post("/projects/{project_id}/queries/import")
async def import_queries(project_id: UUID, file: UploadFile):
    """
    Import queries from CSV/JSON.

    CSV format:
    query_text,ground_truth,ground_truth_chunk_ids
    "What are flu symptoms?","fever, cough, fatigue",""
    """
```

#### Implementation: 3 days

---

## 🟡 P1 Feature #8: Semantic Clustering

### Problem Statement
**Current:** You see individual chunks but not:
- Which chunks are semantically similar?
- Are there topic clusters in your corpus?
- Which chunks are outliers?
- How does query relate to chunk clusters?

### Solution Overview
Cluster chunks using embeddings, visualize with 2D projection (t-SNE/UMAP), show cluster membership.

### Technical Architecture

##### 1. Backend: Clustering Service
```python
class ClusteringService:
    async def cluster_chunks(
        self,
        config_id: UUID,
        method: str = "kmeans",  # or "hdbscan", "agglomerative"
        n_clusters: int = 5
    ) -> ClusteringResult:
        """
        1. Load all embeddings for config
        2. Run clustering algorithm
        3. Compute 2D projection (UMAP)
        4. Return cluster assignments + coordinates
        """

    async def analyze_cluster(
        self,
        cluster_id: int,
        config_id: UUID
    ) -> ClusterAnalysis:
        """
        Analyze a cluster:
        - Representative chunks (closest to centroid)
        - Common terms (TF-IDF)
        - Average similarity within cluster
        """
```

##### 2. Frontend: Cluster Visualizer
```typescript
// Interactive scatter plot with D3.js or Recharts
<ClusterVisualization
  clusters={clusterData}
  onChunkClick={chunk => showChunkDetails(chunk)}
  highlightedQuery={queryEmbedding}  // Show where query falls
/>
```

Visualization:
```
  Cluster 0 (Medical Symptoms)
      🔵 🔵
    🔵   🔵
  🔵       🔵

         ⭐ Query

  Cluster 1 (Treatment)
      🟢 🟢
    🟢   🟢
```

#### Implementation: 2 weeks

---

## 🟢 P2 Feature #9: Custom Evaluators

### Problem Statement
**Current:** Evaluation metrics are fixed (NDCG, MRR, etc.). Domain-specific needs aren't covered:
- Medical: Check if answer includes required disclaimers
- Legal: Verify citations follow specific format
- Customer support: Measure politeness/helpfulness

### Solution Overview
Plugin system for custom evaluation functions.

### Technical Architecture

##### 1. Custom Evaluator Interface
```python
class CustomEvaluator(ABC):
    @abstractmethod
    async def evaluate(
        self,
        query: str,
        chunks: list[Chunk],
        answer: str | None = None
    ) -> dict:
        """
        Return custom metrics as dict.
        Will be merged into result.metrics["custom"]
        """
        pass

# Example: Medical Disclaimer Checker
class MedicalDisclaimerEvaluator(CustomEvaluator):
    async def evaluate(self, query, chunks, answer):
        has_disclaimer = "consult a doctor" in answer.lower()
        return {
            "has_medical_disclaimer": has_disclaimer,
            "disclaimer_check": "pass" if has_disclaimer else "fail"
        }
```

##### 2. Registration System
```python
# In config
{
  "custom_evaluators": [
    {
      "name": "medical_disclaimer",
      "class": "MedicalDisclaimerEvaluator",
      "config": {...}
    }
  ]
}
```

#### Implementation: 1 week

---

## 🟢 P2 Feature #10: Query Augmentation

### Problem Statement
**Current:** Queries tested as-is. In production, you might want to:
- Expand queries with synonyms
- Rewrite queries for clarity
- Generate hypothetical documents (HyDE)
- Try multiple query formulations

### Solution Overview
Query transformation pipeline with multiple strategies.

### Technical Architecture

##### 1. Query Augmentation Service
```python
class QueryAugmentationService:
    async def expand_query(self, query: str) -> list[str]:
        """
        Generate query variations:
        - Synonym replacement
        - Question reformulation
        - Adding context
        """

    async def generate_hyde(self, query: str) -> str:
        """
        Hypothetical Document Embeddings:
        Generate a hypothetical answer, embed that instead of query.
        """
```

##### 2. Multi-Query Strategy
```python
# Config option
{
  "query_augmentation": {
    "enabled": true,
    "strategy": "multi_query",  # or "hyde", "expansion"
    "num_variations": 3
  }
}

# Retrieval
for variation in augmented_queries:
    chunks = await retrieve(variation)
    all_chunks.extend(chunks)

# Deduplicate and re-rank
final_chunks = deduplicate_and_rerank(all_chunks)
```

#### Implementation: 1 week

---

## 📈 Implementation Roadmap

### Phase 1: Critical Blockers (6 weeks)
**Goal:** Transform into complete RAG testing platform

1. **Week 1-2:** Query-time Parameters (P0)
   - Fastest win, biggest impact on iteration speed

2. **Week 3-4:** Chunk Visualizer (P0)
   - Essential for understanding chunking

3. **Week 5-6:** Answer Generation (P0)
   - Core RAG pipeline completion

### Phase 2: Debugging & Insights (4 weeks)
**Goal:** Enable systematic improvement

4. **Week 7-8:** Trace/Debug View (P0)
   - Complete black box problem

5. **Week 9:** False Negative Analysis (P1)
   - Actionable improvement suggestions

6. **Week 10:** Result Versioning (P1)
   - Track progress over time

### Phase 3: Polish & Advanced (3 weeks)
**Goal:** Production-ready features

7. **Week 11:** Export/Import (P1)
   - Data liberation

8. **Week 12-13:** Semantic Clustering (P1)
   - Deep corpus insights

### Phase 4: Power User Features (2 weeks)
**Optional:** For advanced users

9. **Week 14:** Custom Evaluators (P2)
10. **Week 15:** Query Augmentation (P2)

**Total Timeline:** 15 weeks (3.5 months) for complete feature set

---

## 🎯 Success Metrics

### Overall Platform Metrics
- **Iteration Speed:** Time from hypothesis to tested result
  - Current: ~10 minutes (create config + wait)
  - Target: <30 seconds (query-time parameters)

- **User Understanding:** % of users who can explain why a config performed better
  - Current: ~30% (scores but no visibility)
  - Target: 90%+ (visualizations + traces)

- **Complete Testing:** % of teams testing full RAG pipeline
  - Current: 0% (retrieval only)
  - Target: 80%+ (answer generation)

### Feature-Specific Metrics

#### Chunk Visualizer
- ✅ 95% of users try it within first project
- ✅ Identifies chunking issues in 80% of cases
- ✅ Load time <2 seconds for 100-chunk documents

#### Answer Generation
- ✅ 70% of experiments enable answer generation
- ✅ Catches hallucinations in 50%+ of cases
- ✅ Cost estimation within 10% of actual

#### Trace/Debug View
- ✅ Used in 60% of result investigations
- ✅ Users identify performance bottlenecks 90% of time
- ✅ Trace load time <1 second

#### Query-time Parameters
- ✅ Average 10+ parameter variations tested per config
- ✅ Iteration cycles increase 10x
- ✅ Users find optimal settings 3x faster

#### False Negative Analysis
- ✅ Suggestions applied in 40% of cases
- ✅ Recall improvements average +0.15
- ✅ Analysis completes in <3 seconds

---

## 🔧 Technical Considerations

### Performance
- **Database Growth:** Traces add ~10KB per result. For 1000 results = 10MB. Manageable.
- **Query-time Latency:** Must stay <1 second for good UX. Optimize retrieval queries.
- **Clustering:** For 10K chunks, clustering takes ~30 seconds. Pre-compute and cache.

### Scalability
- **Large Documents:** Chunk visualizer may struggle with 500+ chunks. Use pagination.
- **Many Experiments:** Result versioning table will grow. Implement archival after 90 days.
- **Embeddings Export:** For 100K chunks × 1536 dims = 600MB file. Support streaming.

### Security
- **Trace Data:** May contain sensitive document content. Add access controls.
- **Export:** Large files could be used for DoS. Rate limit exports.
- **Custom Evaluators:** Code execution risk. Sandbox or whitelist only.

---

## 📚 Documentation Needs

### User Guides
1. "Understanding Chunking: A Visual Guide" (uses Chunk Visualizer)
2. "Testing Complete RAG Pipelines" (Answer Generation tutorial)
3. "Debugging Poor Results" (Trace View walkthrough)
4. "Fast Experimentation" (Query-time Parameters guide)
5. "Improving Recall" (False Negative Analysis guide)

### API Documentation
- OpenAPI/Swagger docs for all new endpoints
- Example requests/responses
- Rate limits and quotas

### Video Tutorials
- 5-minute quickstart with visualizations
- 10-minute deep dive on trace debugging
- 15-minute masterclass on optimizing RAG

---

## 🧪 Testing Strategy

### Unit Tests
- All service methods have tests
- Mock external APIs (OpenAI)
- Edge cases covered (empty results, errors)

### Integration Tests
- Full pipeline tests (end-to-end)
- Database consistency checks
- Trace accuracy verification

### Performance Tests
- Load testing (1000 concurrent queries)
- Memory profiling (large documents)
- Database query optimization

### User Acceptance Testing
- Beta users test each P0 feature
- Feedback collected and addressed
- Usability issues resolved before release

---

## 🚀 Launch Plan

### V2.0 Alpha (P0 Features Only)
- **Audience:** Internal team + 10 beta users
- **Duration:** 2 weeks
- **Goals:**
  - Validate P0 features work as expected
  - Gather feedback on UX
  - Identify critical bugs

### V2.0 Beta (P0 + P1 Features)
- **Audience:** 50 early adopters
- **Duration:** 4 weeks
- **Goals:**
  - Stress test with real workloads
  - Refine documentation
  - Polish UI/UX

### V2.0 General Release
- **Announcement:** Blog post, Twitter, HN
- **Documentation:** Complete user guides
- **Support:** Community Discord/Slack
- **Marketing:** "From Black Box to Glass Box: RAG Studio V2"

---

## 📝 Conclusion

This specification transforms RAG Studio from a **retrieval optimizer** to a **complete RAG testing platform** by adding critical observability, debugging, and full-pipeline features.

**Key Improvements:**
1. **Visibility:** Chunk visualizer, trace view, clustering
2. **Completeness:** Answer generation + evaluation
3. **Speed:** Query-time parameter overrides
4. **Debugging:** False negative analysis, trace comparison
5. **Insights:** Semantic clustering, result versioning

**Bottom Line:** Users will no longer work in a black box. They'll see HOW their RAG system works, understand WHY results are what they are, and iterate FAST to find optimal configurations.

**Next Steps:**
1. Review and approve this spec
2. Set up project tracking (GitHub Issues/Linear)
3. Begin Phase 1 implementation
4. Ship V2.0 Alpha in 6 weeks

---

*Document Version: 1.0*
*Last Updated: 2025-10-03*
*Approved By: [Pending]*
