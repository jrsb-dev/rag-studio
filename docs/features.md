# RAG Studio - Complete Features Documentation

## 🎯 What is RAG Studio?

RAG Studio is a **testing and optimization platform** for Retrieval-Augmented Generation (RAG) systems. It helps developers discover the optimal RAG configuration for their specific documents without spending hours re-indexing data for each test.

### The Problem It Solves

**Every document corpus is different.** What works for legal documents won't work for medical papers. Most teams use default RAG settings because traditional approaches require:
- Hours of re-indexing for each configuration change
- Expensive trial-and-error testing
- No systematic way to compare different approaches

**RAG Studio's Innovation:** Pre-compute all variations upfront (~5 minutes), then instantly test and compare different retrieval strategies without re-indexing.

---

## 🏗️ Core Architecture

### Backend Stack
- **Framework:** FastAPI (Python async web framework)
- **Database:** PostgreSQL 16 + pgvector extension
- **Vector Search:** pgvector for similarity search
- **Full-Text Search:** PostgreSQL's built-in tsvector/tsquery
- **Document Processing:** LangChain + pypdf
- **Embeddings:** OpenAI API (ada-002, embedding-3-small, embedding-3-large)

### Frontend Stack
- **Framework:** React 18 + TypeScript + Vite
- **UI Library:** TailwindCSS + shadcn/ui (Radix UI primitives)
- **State Management:** TanStack Query (React Query)
- **Routing:** React Router v6

---

## 📚 Complete Feature List

### 1. Project Management

#### 1.1 Projects
**What it does:** Organizes your RAG experiments into separate workspaces.

**Why it exists:** You might work on multiple projects (e.g., legal documents, medical papers, customer support). Each needs different configurations.

**ELI5:** Think of a project like a folder on your computer. You put all files and experiments related to one topic in one folder.

**Features:**
- Create, read, update, delete projects
- Project metadata (name, description, timestamps)
- Isolation between projects (configs, documents, queries don't mix)
- Hierarchical structure: Project → Documents → Configs → Queries → Experiments

**API Endpoints:**
- `POST /api/projects` - Create project
- `GET /api/projects` - List all projects
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project (cascades to all children)

---

### 2. Document Management

#### 2.1 File Upload
**What it does:** Upload documents that you want to test your RAG system against.

**Why it exists:** RAG systems need documents to retrieve information from. You need to test how well your system can find relevant information in YOUR specific documents.

**ELI5:** Like uploading photos to Google Photos. You give RAG Studio your documents, and it stores them so it can search through them later.

**Supported Formats:**
- PDF (.pdf) - Parsed with pypdf
- Plain Text (.txt)
- Markdown (.md)

**Features:**
- Drag-and-drop upload
- Multi-file upload (upload many files at once)
- File metadata tracking (filename, size, type, upload date)
- Full content extraction and storage
- Automatic text extraction from PDFs

**API Endpoint:**
- `POST /api/projects/{id}/documents` - Upload documents (multipart/form-data)

**Technical Details:**
- Files are read into memory, content extracted, and stored in PostgreSQL
- PDF text extraction handles multiple pages
- Content stored as TEXT in database (no file system storage)
- File size and metadata tracked for UI display

#### 2.2 Plain Text Paste
**What it does:** Instead of uploading a file, you can paste text directly into the browser.

**Why it exists:** Sometimes you have text in an email, website, or note that you want to test. Downloading it as a file first is annoying.

**ELI5:** Like copying text from a website and pasting it into a note-taking app. You give it a name, paste the text, and RAG Studio treats it like a document.

**Features:**
- Two-tab interface: "Upload Files" or "Paste Text"
- Name your text document
- Paste any amount of text
- Automatically creates a .txt file internally
- Validation (requires both name and content)

**UI Location:** Documents page → "Paste Text" tab

---

### 3. Configuration System

#### 3.1 RAG Configurations
**What it does:** Defines HOW your RAG system should process documents and find information.

**Why it exists:** There's no "one size fits all" for RAG. Different documents need different chunk sizes, embedding models, and retrieval methods. This lets you test many combinations.

**ELI5:** Like trying different recipes for the same dish. One recipe might use big chunks of vegetables (large chunks), another might dice them fine (small chunks). You want to taste test which works best for YOUR ingredients.

**Configuration Parameters:**

##### A. Chunking Strategy
**What it does:** Decides how to split long documents into smaller pieces.

**Why it exists:** Language models have token limits. Documents need to be split into manageable chunks. HOW you split affects quality.

**Options:**
1. **Fixed** (`chunk_strategy: "fixed"`)
   - Uses RecursiveCharacterTextSplitter
   - Splits at fixed token boundaries
   - Most predictable and reliable
   - **ELI5:** Like cutting a sandwich into equal-sized squares

2. **Semantic** (`chunk_strategy: "semantic"`)
   - Token-aware splitting at natural boundaries (paragraphs, sentences)
   - Tries to keep related content together
   - Better for narrative text
   - **ELI5:** Like cutting a story at chapter endings instead of mid-sentence

3. **Recursive** (`chunk_strategy: "recursive"`)
   - Alias for fixed (uses same implementation)
   - Recursively tries different separators
   - **ELI5:** Same as fixed, just a different name

##### B. Chunk Size
**What it does:** How many tokens per chunk (default: 512).

**Why it exists:** Smaller chunks = more precise but might lack context. Larger chunks = more context but less precise matching.

**ELI5:** Like choosing between reading individual paragraphs vs. whole pages. Paragraphs are easier to scan, pages give more context.

**Typical Values:**
- Small: 256 tokens (~190 words)
- Medium: 512 tokens (~380 words)
- Large: 1024 tokens (~770 words)

##### C. Chunk Overlap
**What it does:** How many tokens to overlap between consecutive chunks (default: 50).

**Why it exists:** Important information might span chunk boundaries. Overlap ensures you don't lose context at boundaries.

**ELI5:** Like reading a book with sticky notes. You overlap each sticky note a bit so you don't miss sentences that span pages.

**Typical Values:**
- No overlap: 0 tokens
- Light overlap: 25-50 tokens
- Heavy overlap: 100-128 tokens

##### D. Embedding Model
**What it does:** Which OpenAI model to use for converting text into vectors.

**Why it exists:** Different models have different quality/speed/cost tradeoffs.

**Options:**
1. **text-embedding-ada-002** (Legacy)
   - 1536 dimensions
   - Cheapest ($0.0001/1K tokens)
   - Reliable baseline
   - **ELI5:** The old reliable model - not the best, but cheap and good enough

2. **text-embedding-3-small** (Recommended)
   - 1536 dimensions
   - Fast and efficient
   - Better quality than ada-002
   - Same cost as ada-002
   - **ELI5:** The upgraded version - better quality, same price

3. **text-embedding-3-large** (Highest Quality)
   - 3072 dimensions (twice the detail)
   - Highest accuracy
   - 5x more expensive than small
   - **ELI5:** The premium option - best quality but costs more

##### E. Retrieval Strategy
**What it does:** How to find relevant chunks for a query.

**Why it exists:** Different retrieval methods have different strengths. Keyword search is fast but misses semantic meaning. Vector search understands meaning but might miss exact keywords. Hybrid combines both.

**Options:**

1. **Dense (Vector Similarity)** (`retrieval_strategy: "dense"`)
   - Uses embedding vectors + cosine similarity
   - Understands semantic meaning ("car" matches "automobile")
   - Best for conceptual queries
   - Requires embeddings (costs money)
   - **ELI5:** Like asking "what does this mean?" instead of "what words does it contain?" It understands that "dog" and "puppy" are related even though they're different words.

   **Technical Details:**
   - Uses pgvector's cosine_distance operator
   - Dimension validation ensures no mismatches
   - Returns chunks sorted by similarity score

2. **BM25 (Keyword Search)** (`retrieval_strategy: "bm25"`)
   - PostgreSQL full-text search with tsvector
   - Keyword-based matching with smart ranking
   - No embeddings needed (FREE and FAST)
   - Best for exact term matching
   - **ELI5:** Like using Ctrl+F to find words in a document. Fast and free, but doesn't understand that "car" and "automobile" mean the same thing.

   **Technical Details:**
   - Uses PostgreSQL's tsvector + GIN index
   - ts_rank_cd for BM25-like scoring
   - Language: English stemming
   - Automatic via database trigger

3. **Hybrid (Dense + BM25)** (`retrieval_strategy: "hybrid"`)
   - Combines vector similarity AND keyword matching
   - Uses Reciprocal Rank Fusion (RRF) to merge results
   - Best of both worlds: semantic + exact matching
   - Requires embeddings
   - **ELI5:** Like having two experts: one who understands meaning, one who's great at finding exact words. They both suggest answers and you pick the best from both lists.

   **Technical Details:**
   - Fetches top_k * 3 from each method
   - RRF formula: score = sum(weight / (60 + rank))
   - Default weights: 50/50 dense/sparse
   - Deduplicates overlapping chunks

##### F. Top K
**What it does:** How many chunks to retrieve per query (default: 5).

**Why it exists:** More chunks = more context but more noise. Fewer chunks = more focused but might miss relevant info.

**ELI5:** Like asking for "top 5 search results" vs "top 20". More results give you options but take longer to read through.

**Typical Values:**
- Precise: 3 chunks
- Balanced: 5 chunks
- High Recall: 10+ chunks

##### G. Evaluation Settings
**What it does:** Configure automatic quality evaluation of retrieval results.

**Why it exists:** You need to measure HOW GOOD each configuration is. Manual checking is slow and subjective.

**Options:**

1. **use_llm_judge** (boolean, default: false)
   - Use GPT to rate chunk relevance
   - Costs money (~$0.01-0.05 per query)
   - Provides 1-5 scores with reasoning
   - **ELI5:** Like hiring a smart judge to rate each search result from 1-5 stars

2. **llm_judge_model** (string, default: "gpt-3.5-turbo")
   - Which GPT model to use for judging
   - Options: "gpt-3.5-turbo" (cheap) or "gpt-4" (better but 10x cost)
   - **ELI5:** Choosing between a faster cheaper judge vs a slower more thorough judge

3. **use_ragas** (boolean, default: false, NOT YET IMPLEMENTED)
   - Advanced evaluation framework
   - Placeholder for future feature
   - **ELI5:** Coming soon - an even smarter evaluation system

**API Endpoints:**
- `POST /api/projects/{id}/configs` - Create configuration
- `GET /api/projects/{id}/configs` - List configurations
- `GET /api/configs/{id}` - Get configuration with chunk count
- `PATCH /api/configs/{id}` - Update configuration (limited fields)
- `DELETE /api/configs/{id}` - Delete configuration and all chunks

**Technical Details:**
- Each config triggers immediate processing of all project documents
- Chunks are pre-computed and stored with embeddings
- Chunk metadata includes: strategy, embedding_model, embedding_dim
- Status tracking: "pending" → "ready" based on chunk count
- BM25-only configs skip embedding generation (saves money)

#### 3.2 Configuration Presets
**What it does:** Pre-made configurations you can activate instantly.

**Why it exists:** Most users don't know what settings to try. Presets give you expert-recommended starting points.

**ELI5:** Like recipe templates. Instead of figuring out ingredients yourself, you start with a proven recipe and tweak it.

**Preset Categories:**

##### Balanced Presets
1. **Balanced Default**
   - Strategy: Fixed, 512 tokens, 50 overlap
   - Model: ada-002
   - Retrieval: Dense
   - Top K: 5
   - **Why:** All-around good performance, cheapest option

2. **Balanced Hybrid**
   - Strategy: Fixed, 512 tokens, 50 overlap
   - Model: ada-002
   - Retrieval: Hybrid
   - Top K: 5
   - **Why:** Better accuracy than pure dense, slight cost increase

##### Quality-Focused Presets
3. **Quality - Large Context**
   - Strategy: Semantic, 1024 tokens, 100 overlap
   - Model: embedding-3-large
   - Retrieval: Hybrid
   - Top K: 3
   - **Why:** Maximum quality for complex queries, highest cost

4. **Quality - Recursive Chunking**
   - Strategy: Recursive, 768 tokens, 75 overlap
   - Model: embedding-3-large
   - Retrieval: Dense
   - Top K: 5
   - **Why:** Smart chunking + best embeddings

##### Speed-Focused Presets
5. **Speed - Small Chunks**
   - Strategy: Fixed, 256 tokens, 25 overlap
   - Model: embedding-3-small
   - Retrieval: Dense
   - Top K: 5
   - **Why:** Fast retrieval, smaller chunks = faster processing

6. **Speed - Keyword Only**
   - Strategy: Fixed, 512 tokens, 0 overlap
   - Model: N/A (no embeddings)
   - Retrieval: BM25
   - Top K: 5
   - **Why:** Fastest possible, completely free, no API calls

##### Experimental Presets
7. **Experimental - Semantic Chunking**
   - Strategy: Semantic, 512 tokens, 50 overlap
   - Model: embedding-3-large
   - Retrieval: Hybrid
   - Top K: 7
   - **Why:** Best for narrative text like articles or books

8. **Experimental - High Recall**
   - Strategy: Fixed, 384 tokens, 128 overlap
   - Model: embedding-3-small
   - Retrieval: Hybrid
   - Top K: 10
   - **Why:** Maximum coverage, ensures you don't miss anything

**UI Features:**
- Grid view with category badges
- Preview dialog showing all settings
- One-click activation
- Descriptions explain when to use each preset

---

### 4. Query Management

#### 4.1 Test Queries
**What it does:** Create test queries to evaluate your RAG configurations.

**Why it exists:** You need realistic queries to test your system. These are the questions your users will actually ask.

**ELI5:** Like writing practice questions for a test. You create questions your system should be able to answer based on the documents.

**Features:**
- Create multiple test queries per project
- Simple text input
- Query stored with metadata (creation date, project relation)
- Used across multiple experiments

**API Endpoints:**
- `POST /api/projects/{id}/queries` - Create query
- `GET /api/projects/{id}/queries` - List queries
- `DELETE /api/queries/{id}` - Delete query

#### 4.2 Ground Truth (Optional)
**What it does:** Tell the system what the "correct answer" or "correct chunks" should be for a query.

**Why it exists:** Without ground truth, evaluation metrics can't tell if retrieval is correct. With ground truth, you get precision, recall, and other quality metrics.

**ELI5:** Like an answer key for a test. You tell the system "this question should return these specific chunks" so it can grade itself.

**Two Modes:**

##### Text-Based Ground Truth (`ground_truth` field)
**What it does:** Provide the expected answer as text.

**How it works:**
- System generates embedding of ground truth text
- Finds chunks with >75% semantic similarity
- Those chunks are marked as "relevant"
- Used to calculate precision, recall, F1, etc.

**Example:**
```json
{
  "query_text": "What are the side effects of aspirin?",
  "ground_truth": "Common side effects include stomach upset, heartburn, and nausea"
}
```

**ELI5:** You write down what the correct answer looks like, and the system finds which chunks match that answer.

##### Chunk ID Ground Truth (`ground_truth_chunk_ids` field)
**What it does:** Explicitly specify which chunk IDs are relevant.

**How it works:**
- Power users can list exact chunk UUIDs
- No semantic matching needed
- Direct precision measurement

**Example:**
```json
{
  "query_text": "What are the side effects?",
  "ground_truth_chunk_ids": [
    "a1b2c3d4-...",
    "e5f6g7h8-..."
  ]
}
```

**ELI5:** Instead of describing the answer, you point directly to the exact document sections that contain the answer.

**Why Two Modes?**
- Text-based: Easier for most users, more flexible
- Chunk ID: More precise, for advanced users who know their data

---

### 5. Experiments System

#### 5.1 Running Experiments
**What it does:** Tests selected configurations against selected queries, producing ranked results with metrics.

**Why it exists:** This is the CORE VALUE of RAG Studio - systematically compare different RAG configurations to find the best one.

**ELI5:** Like a science experiment. You test multiple recipes (configs) with the same ingredients (queries) and measure which recipe produces the best results.

**Workflow:**
1. Select 1+ configurations to test
2. Select 1+ test queries
3. Preview estimated cost (if using LLM judge)
4. Run experiment
5. View results with rankings and metrics

**What Happens During an Experiment:**

**For each Config × Query combination:**
1. Generate query embedding (if needed for retrieval strategy)
2. Retrieve top-k chunks using the config's retrieval strategy
3. Run evaluation pipeline:
   - Basic IR metrics (always, free)
   - LLM judge (if enabled, costs money)
   - RAGAS (future, not yet implemented)
4. Calculate primary score for ranking
5. Store result with all metrics and retrieved chunks
6. Track latency and costs

**Technical Details:**
- Async processing of all combinations
- Error handling: dimension mismatches create error results instead of failing
- Status tracking: "running" → "completed" or "failed"
- Atomic: all results committed together

**API Endpoints:**
- `POST /api/projects/{id}/experiments` - Create and run experiment
- `GET /api/projects/{id}/experiments` - List experiments
- `GET /api/experiments/{id}` - Get experiment details
- `GET /api/experiments/{id}/results` - Get formatted results

#### 5.2 Cost Estimation
**What it does:** Estimates LLM judge costs before running an experiment.

**Why it exists:** LLM evaluation can get expensive. Users should see costs upfront and decide if it's worth it.

**ELI5:** Like seeing the price tag before buying something. You know exactly how much the evaluation will cost before you click "run."

**Formula:**
```
cost = num_queries × num_configs × top_k × cost_per_evaluation
```

**Model Costs:**
- GPT-3.5-turbo: ~$0.01 per query
- GPT-4: ~$0.05 per query

**Features:**
- Real-time calculation as you select configs/queries
- Warning if cost exceeds $10
- Breakdown by evaluation type
- Shows: "Basic metrics (free) + LLM judge ($X.XX)"

**UI Location:** Experiment creation modal, updates live

**API Endpoint:**
- `POST /api/experiments/estimate-cost` - Calculate estimated cost

#### 5.3 Results Visualization
**What it does:** Shows experiment results in a ranked, comparative format.

**Why it exists:** You need to quickly see which configuration performed best and understand why.

**ELI5:** Like a leaderboard showing which player (config) scored highest, with details on how they scored each point.

**Features:**

##### Config Ranking
- Configs sorted by average score (highest first)
- Average score + average latency displayed
- Color-coded by performance
- Expandable to see per-query results

##### Per-Query Results
- Query text displayed
- Retrieved chunks shown (truncated)
- Score and latency for this specific query
- Full metrics available on click

##### Metrics Display
**Always Shown (Free):**
- Primary score (composite metric)
- Latency in milliseconds
- Number of chunks retrieved

**Expandable Sections:**
- **Basic IR Metrics** (green badge)
  - MRR, NDCG@K, Precision, Recall, F1, Hit Rate
  - Diversity and avg chunk length
  - Tooltips explain each metric

- **LLM Judge Evaluation** (purple badge, if enabled)
  - Average relevance score (1-5)
  - Max and min scores
  - Per-chunk evaluations with reasoning
  - Individual chunk scores and GPT explanations

##### Chunk Display
- First 200 characters of each chunk
- Chunk rank within results
- Individual scores (if available)

**UI Components:**
- `MetricsDisplay.tsx` - Main metrics component
- `ExperimentResultsPage.tsx` - Results page
- Collapsible sections with smooth animations
- Copy buttons for chunk content

---

### 6. Evaluation System

**What it does:** Automatically measures the quality of retrieval results.

**Why it exists:** "Which config is better?" needs objective measurement. Manual checking doesn't scale.

**ELI5:** Like having judges at a competition. They watch each performance (retrieval) and give scores based on different criteria.

#### 6.1 Three-Tier Evaluation Architecture

##### Tier 1: Basic IR Metrics (Always Free, Instant)
**What it does:** Calculates information retrieval metrics using ground truth.

**Why it exists:** Standard academic metrics for measuring retrieval quality. No API costs, instant calculation.

**ELI5:** Like grading a multiple choice test - clear right/wrong answers based on the answer key you provided.

**Ground Truth-Dependent Metrics:**

1. **MRR (Mean Reciprocal Rank)**
   - **What:** 1 / rank of first relevant result
   - **Range:** 0.0 to 1.0 (higher is better)
   - **Why:** Measures how quickly users find relevant information
   - **ELI5:** If the correct answer is the first result, you get 1.0. If it's second, you get 0.5. If it's third, you get 0.33. Rewards putting correct answers first.
   - **Example:** Relevant chunk at position 1 → MRR = 1.0, at position 3 → MRR = 0.33

2. **NDCG@K (Normalized Discounted Cumulative Gain)**
   - **What:** Relevance-weighted score considering position
   - **Range:** 0.0 to 1.0 (higher is better)
   - **Why:** Most important metric for ranking quality
   - **ELI5:** Like grading homework where earlier problems are worth more points. Getting the first answer right matters more than the last.
   - **Formula:** Considers both relevance and position with logarithmic discount

3. **Precision@K**
   - **What:** % of retrieved chunks that are relevant
   - **Range:** 0.0 to 1.0 (higher is better)
   - **Why:** Measures accuracy - are you showing good results?
   - **ELI5:** Out of 5 results shown, how many were actually helpful? If 4 out of 5, precision = 0.8
   - **Formula:** (# relevant retrieved) / (# total retrieved)

4. **Recall@K**
   - **What:** % of relevant chunks that were retrieved
   - **Range:** 0.0 to 1.0 (higher is better)
   - **Why:** Measures completeness - did you find all relevant chunks?
   - **ELI5:** If there are 10 correct answers total and you found 6, recall = 0.6
   - **Formula:** (# relevant retrieved) / (# total relevant)

5. **F1@K**
   - **What:** Harmonic mean of precision and recall
   - **Range:** 0.0 to 1.0 (higher is better)
   - **Why:** Balances precision and recall in one number
   - **ELI5:** The overall grade that considers both "did you find correct answers?" (recall) and "were your answers correct?" (precision)
   - **Formula:** 2 × (precision × recall) / (precision + recall)

6. **Hit Rate@K**
   - **What:** Binary - did we get ANY relevant result?
   - **Range:** 0.0 or 1.0
   - **Why:** Minimum bar - is system usable at all?
   - **ELI5:** Did you get at least one right answer? Yes = 1.0, No = 0.0
   - **Simple:** Just checks if any retrieved chunk is relevant

**Ground Truth-Independent Metrics:**

7. **Diversity**
   - **What:** How different retrieved chunks are from each other
   - **Range:** 0.0 to 1.0 (higher = more diverse)
   - **Why:** Low diversity means redundant results (showing same info multiple times)
   - **ELI5:** If all 5 results say the exact same thing, diversity is low. If each says something different, diversity is high.
   - **Calculation:** Pairwise cosine distance between chunk embeddings
   - **Note:** Only available for dense/hybrid (needs embeddings)

8. **Average Chunk Length**
   - **What:** Mean character count of retrieved chunks
   - **Range:** Varies by chunking strategy
   - **Why:** Context length affects usability
   - **ELI5:** Are your search results short tweets or long essays? This measures average length.

**Smart Ground Truth Matching:**
- If user provides text-based ground truth:
  - System generates embedding of ground truth
  - Finds chunks with >75% cosine similarity
  - Those chunks marked as "relevant"
  - Enables all ground-truth metrics

##### Tier 2: LLM Judge Evaluator (Optional, Costs Money)
**What it does:** Uses GPT to rate each retrieved chunk's relevance to the query.

**Why it exists:** Sometimes you don't have ground truth, or you want a second opinion. GPT can judge relevance like a human would.

**ELI5:** Like having a smart assistant read your search results and rate each one: "This is very relevant (5 stars), this is somewhat relevant (3 stars), this is not relevant (1 star)."

**How It Works:**
1. For each retrieved chunk:
   - Send query + chunk to GPT
   - Ask for 1-5 relevance score + reasoning
   - Parse JSON response
2. Aggregate scores:
   - Average score across all chunks
   - Max score (best chunk)
   - Min score (worst chunk)
3. Store per-chunk evaluations with reasoning

**Prompt Template:**
```
Rate the relevance of this text chunk to the query on a scale of 1-5:

Query: {query_text}

Chunk: {chunk_content}

1 = Not relevant at all
2 = Slightly relevant
3 = Moderately relevant
4 = Very relevant
5 = Extremely relevant

Provide your rating and brief reasoning in JSON format:
{
  "score": <1-5>,
  "reasoning": "<brief explanation>",
  "key_points": ["<point 1>", "<point 2>"]
}
```

**Cost Per Query:**
- GPT-3.5-turbo: ~$0.01 per query (5 chunks × ~500 tokens each)
- GPT-4: ~$0.05 per query (higher quality but 10x cost)

**Features:**
- Parallel processing (all chunks evaluated concurrently)
- Error handling (if GPT fails, continue with other chunks)
- Caching (results stored in database)
- Detailed reasoning preserved

**Output Format:**
```json
{
  "llm_judge": {
    "model": "gpt-3.5-turbo",
    "avg_score": 3.8,
    "max_score": 5.0,
    "min_score": 2.0,
    "per_chunk_scores": [
      {
        "chunk_id": "...",
        "score": 5,
        "reasoning": "Directly answers the query about...",
        "key_points": ["Contains exact information", "Well structured"]
      },
      ...
    ]
  }
}
```

##### Tier 3: RAGAS Evaluation (Planned, Not Yet Implemented)
**What it does:** Advanced evaluation framework for RAG systems.

**Why it exists:** RAGAS provides specialized metrics for RAG like faithfulness, answer relevance, and context precision.

**ELI5:** Coming soon - an even smarter evaluation system designed specifically for RAG.

**Placeholder Status:**
- UI shows "Coming Soon"
- Backend has TODO markers
- Will integrate RAGAS library when implemented

#### 6.2 Primary Score Selection
**What it does:** Selects ONE primary score for ranking configs.

**Why it exists:** Multiple metrics are confusing. Users need one number to compare configs.

**ELI5:** Like GPA in school - you have grades in many subjects, but GPA is the one number that summarizes everything.

**Priority Order:**
1. **RAGAS composite** (if available) - Not yet implemented
2. **LLM judge average** (if available) - User opted in and paid for it
3. **NDCG@5** (if ground truth available) - Most important ranking metric
4. **Diversity score** (fallback) - Ground truth-independent

**Logic:**
- Use the most informative metric available
- Falls back gracefully if data missing
- Always produces a primary score for ranking

**Display:**
- Shown prominently in results table
- Used to sort configs (highest first)
- Other metrics available in expandable sections

---

### 7. Settings Management

#### 7.1 OpenAI API Key Storage
**What it does:** Securely stores your OpenAI API key for embedding and LLM operations.

**Why it exists:** The system needs your API key to generate embeddings and run LLM judge evaluations.

**ELI5:** Like giving the app permission to use your Spotify account. It needs your credentials to use OpenAI's services on your behalf.

**Features:**
- Encrypted storage in database
- Never exposed in API responses
- Required for: embeddings, LLM judge
- Validated on first use

**API Endpoints:**
- `POST /api/settings/openai-key` - Set API key
- `GET /api/settings/openai-key` - Check if key exists (doesn't return actual key)

**Security:**
- Stored in settings table with encryption
- Only decrypted when making API calls
- Not included in logs or error messages

**UI Location:** Settings page (accessible from navigation)

---

### 8. User Interface Features

#### 8.1 Navigation System
**What it does:** Hierarchical navigation with context-aware sidebars.

**Why it exists:** Users need to navigate between projects, documents, configs, queries, and experiments easily.

**ELI5:** Like folders in Windows Explorer. You click into a project, and now you see that project's documents, configs, etc.

**Structure:**
- **Top-level:** Projects list
- **Project-level sidebar:**
  - Overview
  - Documents
  - Configurations
  - Queries
  - Experiments (create new)
  - Experiments (view results)

**Components:**
- `Layout.tsx` - Top-level app layout
- `ProjectLayout.tsx` - Project-specific sidebar
- React Router for navigation
- Breadcrumbs for context

#### 8.2 Tabs Interface
**What it does:** Organize related content in switchable tabs.

**Why it exists:** Multiple ways to do the same thing (upload file vs paste text) without cluttering the UI.

**ELI5:** Like tabs in a web browser. Each tab shows different content, but you can switch between them easily.

**Usage:**
- Documents page: "Upload Files" | "Paste Text"
- Future use: Any page with multiple modes

**Component:** shadcn/ui Tabs (Radix UI primitive)

#### 8.3 Modal Dialogs
**What it does:** Overlay dialogs for creating/editing resources without leaving the page.

**Why it exists:** Better UX than navigating to separate pages for quick actions.

**ELI5:** Like a popup form that appears on top of your current page. Fill it out, submit, and the popup disappears.

**Used For:**
- Create configuration
- Create query
- Create experiment
- Preview preset details
- Confirmation dialogs

**Components:**
- shadcn/ui Dialog
- Form validation with React Hook Form

#### 8.4 Toast Notifications
**What it does:** Shows temporary notifications for actions (success, error, info).

**Why it exists:** Users need immediate feedback when they do something.

**ELI5:** Like a little message that pops up saying "File uploaded!" or "Error: Something went wrong" and disappears after a few seconds.

**Triggers:**
- Successful uploads
- Configuration created
- Experiment started
- Errors and warnings

**Component:** shadcn/ui Toast (Sonner library)

#### 8.5 Loading States
**What it does:** Shows spinners, skeletons, and disabled states during async operations.

**Why it exists:** Users need to know the app is working, not frozen.

**ELI5:** Like a spinning wheel on your phone when an app is loading. It tells you "I'm working on it, please wait."

**Implementations:**
- Spinner for fetching data
- Button disabled state during mutations
- Skeleton screens for slow-loading content
- Progress indicators

**Library:** TanStack Query handles loading states automatically

#### 8.6 Responsive Design
**What it does:** Layout adapts to different screen sizes (desktop, tablet, mobile).

**Why it exists:** Users access the app on different devices.

**ELI5:** Like a website that looks good on your phone AND your computer. The layout rearranges to fit the screen.

**Features:**
- Mobile-friendly navigation
- Responsive grid layouts
- Touch-friendly buttons
- Breakpoint-based styling

**Implementation:** TailwindCSS responsive utilities

#### 8.7 Dark Mode Support
**What it does:** Adapts UI colors for dark mode (if browser/OS prefers dark).

**Why it exists:** Many users prefer dark mode, especially for long sessions.

**ELI5:** Like Instagram's dark mode - easier on your eyes at night.

**Implementation:**
- TailwindCSS dark mode
- CSS variables for theme colors
- Automatic detection of system preference

#### 8.8 Drag-and-Drop Upload
**What it does:** Drag files from your desktop directly into the browser.

**Why it exists:** Faster than clicking "Browse" and navigating folders.

**ELI5:** Like dragging a file into an email attachment. Just grab it and drop it on the upload area.

**Features:**
- Visual feedback (border highlights when dragging)
- Multi-file support
- File type validation

**Location:** Documents page upload area

#### 8.9 Form Validation
**What it does:** Checks your input before submitting (required fields, correct formats, etc.).

**Why it exists:** Prevents errors and bad data from entering the system.

**ELI5:** Like spell-check for forms. It tells you "Hey, you forgot to fill in the name field" before you submit.

**Features:**
- Real-time validation
- Clear error messages
- Disabled submit until valid
- Visual indicators (red borders, error text)

**Library:** React Hook Form + Zod schemas

#### 8.10 Data Tables
**What it does:** Displays lists of items (documents, configs, queries) with sorting and actions.

**Why it exists:** Users need to browse and manage their resources.

**ELI5:** Like a spreadsheet showing all your files with columns for name, date, size, etc.

**Features:**
- Sortable columns
- Action buttons (delete, edit)
- Hover effects
- Empty states ("No documents yet")

**Styling:** TailwindCSS + shadcn/ui Card components

---

### 9. Technical Features (Under the Hood)

#### 9.1 Database Migrations (Alembic)
**What it does:** Version-controlled schema changes for the database.

**Why it exists:** As the app evolves, the database structure needs to change. Migrations ensure everyone's database stays in sync.

**ELI5:** Like app updates on your phone. When the app changes, the database needs to update too. Migrations are the instructions for those updates.

**Migration History:**
1. `33444aadd27e` - Initial schema (projects, documents, configs, chunks, queries, experiments, results)
2. `d1fd168f4ea4` - Add settings table
3. `0eec8bc5b2e0` - Update vector dimensions to 3072
4. `bb44a3dc2f9d` - Make vector dimensions dynamic
5. `3a1bf69f9454` - Add evaluation metrics
6. `a41c24051a4b` - Add full-text search support (tsvector)

**Commands:**
- `alembic upgrade head` - Apply all migrations
- `alembic downgrade -1` - Revert last migration
- `alembic revision -m "message"` - Create new migration

#### 9.2 Async Everything
**What it does:** Backend and frontend use async operations for concurrency.

**Why it exists:** Embedding generation, database queries, and API calls are slow. Async operations don't block.

**ELI5:** Like cooking multiple dishes at once. While one is in the oven, you chop vegetables for another. You don't wait for each step to finish before starting the next.

**Backend:**
- FastAPI async endpoints
- SQLAlchemy async sessions
- Async HTTP clients for OpenAI

**Frontend:**
- TanStack Query for async state management
- Promise-based API calls
- Concurrent mutations

#### 9.3 Vector Dimension Safety
**What it does:** Validates embedding dimensions before vector operations.

**Why it exists:** Mixing 1536-dim and 3072-dim vectors causes crashes. Must ensure compatibility.

**ELI5:** Like making sure puzzle pieces are from the same puzzle. You can't force pieces from different puzzles together.

**Implementation:**
- Chunk metadata stores `embedding_dim`
- Retrieval filters by dimension: `WHERE embedding_dim = query_dim`
- Errors if dimension mismatch detected
- Graceful fallback (creates error result instead of crashing experiment)

**Example Error:**
```
"No chunks with 3072 dimensions found for config X. Embedding model mismatch detected."
```

#### 9.4 Database Triggers
**What it does:** Automatically updates tsvector column when chunk content changes.

**Why it exists:** tsvector must stay in sync with content for BM25 search to work.

**ELI5:** Like auto-save in Google Docs. Every time you change the document (chunk content), the system automatically updates the search index.

**Trigger:**
```sql
CREATE TRIGGER chunks_content_tsv_update
BEFORE INSERT OR UPDATE
ON chunks
FOR EACH ROW
EXECUTE FUNCTION chunks_content_tsv_trigger();
```

**Function:**
```sql
new.content_tsv := to_tsvector('english', coalesce(new.content, ''));
```

#### 9.5 Connection Pooling
**What it does:** Reuses database connections instead of creating new ones for each request.

**Why it exists:** Creating connections is slow. Pooling makes the app faster.

**ELI5:** Like carpooling. Instead of everyone driving their own car (new connection), people share rides (reuse connections).

**Configuration:**
- PostgreSQL connection pool
- SQLAlchemy async engine
- Automatic connection management

#### 9.6 Error Handling & Logging
**What it does:** Catches errors, logs them, and returns helpful messages to users.

**Why it exists:** Things go wrong. Users need useful error messages, developers need logs to debug.

**ELI5:** Like a helpful error message that says "File too large" instead of just crashing silently.

**Features:**
- Try/catch blocks around API calls
- Validation errors return 400 with details
- Server errors return 500 with generic message
- Detailed logs for debugging (server-side only)

**Example:**
```python
try:
    result = await service.create_config(...)
except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

#### 9.7 Batch Processing
**What it does:** Processes multiple items together (e.g., embed 100 chunks at once).

**Why it exists:** OpenAI API has rate limits and batch calls are more efficient.

**ELI5:** Like buying groceries. Instead of making 20 trips for each item, you buy everything in one trip.

**Usage:**
- `embed_batch()` instead of calling `embed_single()` 100 times
- Chunks processed in batches during config creation
- LLM judge evaluations run in parallel

**Optimization:**
- Reduces API call overhead
- Respects rate limits
- Faster overall processing

#### 9.8 Cascading Deletes
**What it does:** When you delete a project, all related data (documents, configs, chunks, experiments) are automatically deleted.

**Why it exists:** Manual cleanup is error-prone and can leave orphaned data.

**ELI5:** Like deleting a folder on your computer. All files inside are deleted too, not just the folder.

**Database Schema:**
```sql
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
```

**Cascade Chain:**
- Delete Project → Deletes Documents → Deletes Chunks
- Delete Project → Deletes Configs → Deletes Chunks, Results
- Delete Project → Deletes Queries
- Delete Project → Deletes Experiments → Deletes Results

#### 9.9 Database Indexes
**What it does:** Speeds up common queries by creating indexes on frequently-searched columns.

**Why it exists:** Searching through millions of chunks is slow without indexes.

**ELI5:** Like an index in a textbook. Instead of reading every page to find "vectors," you look in the index and jump directly to page 47.

**Indexes Created:**
- `config_id` (for filtering chunks by config)
- `document_id` (for filtering chunks by document)
- `content_tsv` (GIN index for full-text search)
- `metrics` (GIN index for JSONB queries)
- `evaluation_settings` (GIN index for JSONB queries)

**Performance Impact:**
- Queries go from O(n) → O(log n)
- BM25 search uses GIN index (very fast)
- Vector search uses pgvector HNSW index (approximate nearest neighbor)

#### 9.10 Type Safety (TypeScript + Pydantic)
**What it does:** Catches type errors at compile time (TypeScript) and runtime (Pydantic).

**Why it exists:** Type errors cause bugs. Catching them early saves debugging time.

**ELI5:** Like a spell-checker for code. It tells you "Hey, you're trying to use a number where you need text" before you even run the code.

**Frontend (TypeScript):**
```typescript
interface Config {
  id: string
  name: string
  chunk_size: number  // Must be number, not string
  retrieval_strategy: 'dense' | 'bm25' | 'hybrid'  // Must be one of these
}
```

**Backend (Pydantic):**
```python
class ConfigCreate(BaseModel):
    name: str
    chunk_size: int = Field(gt=0, le=2048)  # Must be 1-2048
    retrieval_strategy: Literal['dense', 'bm25', 'hybrid']
```

**Benefits:**
- Auto-completion in IDE
- Compile-time error checking
- Runtime validation
- Self-documenting code

---

## 🔄 Complete User Workflows

### Workflow 1: First-Time Setup
1. **Start Backend:** `docker-compose up -d` (PostgreSQL + pgvector)
2. **Run Migrations:** `alembic upgrade head`
3. **Start Backend Server:** `poetry run uvicorn app.main:app`
4. **Start Frontend:** `npm run dev`
5. **Open App:** http://localhost:5173
6. **Set API Key:** Settings → Enter OpenAI API key

### Workflow 2: Basic RAG Testing
1. **Create Project:** "Medical Q&A System"
2. **Upload Documents:** Drag PDF medical textbooks
3. **Create Configs:** Activate 3 presets (Balanced Default, Quality - Large Context, Speed - Keyword Only)
4. **Wait for Processing:** ~5 minutes for embedding generation
5. **Create Queries:** Add 5 test questions
6. **Run Experiment:** Select all 3 configs + all 5 queries
7. **View Results:** See which config performed best

### Workflow 3: Advanced Evaluation with Ground Truth
1. **Create Queries with Ground Truth:**
   - Query: "What are common flu symptoms?"
   - Ground Truth: "Common flu symptoms include fever, cough, sore throat, body aches, headache, fatigue"
2. **Enable LLM Judge:** Edit config → Enable LLM judge → Select GPT-4
3. **Run Experiment:** Preview cost ($2.50), confirm
4. **Analyze Results:**
   - Check NDCG@5 (ground truth-based)
   - Check LLM judge scores (AI-based)
   - Read GPT reasoning for why chunks scored high/low

### Workflow 4: Comparing Retrieval Strategies
1. **Create 3 Configs (Same except retrieval):**
   - Config A: Dense only
   - Config B: BM25 only
   - Config C: Hybrid
2. **Same chunking/embedding for fair comparison**
3. **Run Experiment:** All 3 configs, same queries
4. **Compare:**
   - Dense: Best semantic matching
   - BM25: Best exact keyword matching
   - Hybrid: Best overall (combines both strengths)

### Workflow 5: Optimizing for Cost
1. **Start with Expensive Config:** Quality - Large Context (3072-dim, hybrid)
2. **Run Experiment:** Measure baseline performance
3. **Create Cheaper Variants:**
   - Replace embedding-3-large → embedding-3-small
   - Reduce chunk_size: 1024 → 512
   - Switch to dense only (skip BM25)
4. **Compare Performance:** If quality drop is minimal, use cheaper config
5. **Production Config:** Balanced quality/cost

---

## 📊 Metrics Cheat Sheet

### When to Use Each Metric

| Metric | Use When | Don't Use When |
|--------|----------|----------------|
| **NDCG@K** | Ranking quality matters | No ground truth |
| **MRR** | First result most important | All results equally important |
| **Precision** | Accuracy more important than completeness | Need to find all relevant items |
| **Recall** | Need to find everything | Showing irrelevant items is bad |
| **F1** | Balance accuracy and completeness | One matters more than other |
| **Hit Rate** | Minimum bar (any result OK) | Need high-quality ranking |
| **Diversity** | Avoiding redundancy | Redundancy is acceptable |
| **LLM Judge** | No ground truth OR want human-like judgment | Have good ground truth and want to save money |

---

## 💡 Best Practices

### For Document Upload
- **Chunk together:** Upload all related documents at once
- **Clean PDFs:** Ensure PDFs have extractable text (not scanned images)
- **Reasonable size:** Keep individual files under 10MB for performance

### For Configurations
- **Start with presets:** Use proven configurations first
- **Test systematically:** Change ONE parameter at a time
- **Name clearly:** "Small-Dense-Ada" better than "Config 1"
- **Consider cost:** Embedding-3-small is often sweet spot

### For Queries
- **Use real questions:** Actual user queries, not generic
- **5-10 queries:** Enough for statistical significance
- **Add ground truth:** Even for 2-3 queries, enables powerful metrics
- **Vary difficulty:** Mix easy and hard queries

### For Experiments
- **Preview cost:** Always check before running LLM judge
- **Start small:** Test 1-2 configs first, then scale up
- **Use BM25 baseline:** Always include a BM25 config for comparison
- **Save results:** Experiment history helps track improvements

### For Evaluation
- **Basic metrics first:** Free and fast, try before paying for LLM judge
- **Ground truth is gold:** Invest time creating good ground truth
- **LLM judge for ambiguity:** Use when ground truth is hard to define
- **Trust NDCG:** Most important ranking metric in academic literature

---

## 🚀 Advanced Features (Power Users)

### 1. Chunk ID Ground Truth
For experts who know their data inside-out:
```json
{
  "query_text": "Explain photosynthesis",
  "ground_truth_chunk_ids": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  ]
}
```

### 2. Custom Evaluation Weights
Hybrid search supports custom weights (not exposed in UI yet):
```python
search_hybrid(
    query_embedding=embedding,
    query_text=text,
    dense_weight=0.7,  # Favor semantic matching
    sparse_weight=0.3  # Less emphasis on keywords
)
```

### 3. Direct API Access
All features available via REST API:
```bash
# Create config via API
curl -X POST http://localhost:8000/api/projects/{id}/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Config",
    "chunk_strategy": "fixed",
    "chunk_size": 768,
    ...
  }'
```

### 4. Database Direct Access
Power users can query PostgreSQL directly:
```sql
-- Find chunks with high diversity
SELECT config_id, AVG(similarity) as avg_similarity
FROM (
  SELECT
    c1.config_id,
    1 - (c1.embedding <=> c2.embedding) as similarity
  FROM chunks c1, chunks c2
  WHERE c1.config_id = c2.config_id
    AND c1.id < c2.id
) subquery
GROUP BY config_id
ORDER BY avg_similarity DESC;
```

### 5. Bulk Operations
Upload many documents programmatically:
```python
import requests

files = [('files', open(f, 'rb')) for f in file_paths]
response = requests.post(
    f'http://localhost:8000/api/projects/{project_id}/documents',
    files=files
)
```

---

## 🔧 Configuration Files

### Backend Configuration (`.env`)
```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/ragstudio

# OpenAI (can also be set via Settings UI)
OPENAI_API_KEY=sk-...

# Server
HOST=0.0.0.0
PORT=8000
```

### Frontend Configuration (`vite.config.ts`)
```typescript
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
```

---

## 📈 Performance Characteristics

### Embedding Generation (per 1000 chunks)
- **ada-002:** ~30 seconds, $0.10
- **embedding-3-small:** ~30 seconds, $0.10
- **embedding-3-large:** ~45 seconds, $0.50

### Retrieval Speed (per query)
- **BM25:** ~5-20ms (depends on corpus size)
- **Dense:** ~20-50ms (depends on vector count)
- **Hybrid:** ~30-70ms (both + RRF)

### Database Storage (per 1000 chunks)
- **Text only (BM25):** ~500KB
- **Text + 1536-dim vectors:** ~6MB
- **Text + 3072-dim vectors:** ~12MB

---

## 🎓 Learning Resources

### Understanding RAG
- **What is RAG?** Retrieval-Augmented Generation combines search (retrieval) with AI generation
- **Why RAG?** Gives AI access to your specific documents without retraining
- **How RAG Works:** Query → Find relevant chunks → Feed to LLM → Generate answer

### Understanding Embeddings
- **What:** Numerical representations of text (vectors)
- **Why:** Computers can measure similarity between vectors
- **Example:** "dog" and "puppy" have similar embeddings, "dog" and "car" don't

### Understanding Vector Search
- **What:** Find documents with similar embeddings to query
- **How:** Cosine similarity measures angle between vectors
- **Trade-off:** Slower but understands meaning

### Understanding BM25
- **What:** Keyword-based ranking algorithm
- **How:** Scores documents by term frequency & document frequency
- **Trade-off:** Faster but misses semantic similarity

---

## 🐛 Troubleshooting

### "No chunks found for config"
- **Cause:** Config processing failed or still running
- **Fix:** Check config status, wait for "ready", re-create if failed

### "Embedding model mismatch"
- **Cause:** Querying with different embedding model than config used
- **Fix:** Ensure experiment uses config's embedding model

### "OpenAI API key not configured"
- **Cause:** No API key in settings
- **Fix:** Settings → Enter API key

### Slow config creation
- **Cause:** Large documents + expensive embeddings
- **Fix:** Use embedding-3-small or BM25-only for testing

### Empty BM25 results
- **Cause:** Query keywords don't match document text
- **Normal:** BM25 returns empty if no keyword matches (expected)

---

## 🔮 Future Roadmap

### Planned Features
1. **RAGAS Integration** - Advanced RAG evaluation metrics
2. **Background Processing** - Config creation as async tasks
3. **More Embedding Providers** - Cohere, HuggingFace, etc.
4. **Custom Chunking** - User-defined splitting logic
5. **Export Results** - CSV/JSON export of experiment data
6. **Result Comparison** - Side-by-side diff of configs
7. **Query Rewriting** - Automatic query expansion
8. **Multi-language Support** - Non-English documents
9. **Collaborative Features** - Share projects with team
10. **API Documentation** - Interactive Swagger docs

---

## 📝 Summary

RAG Studio is a **comprehensive testing platform** that solves the fundamental problem of RAG optimization: **finding the best configuration without expensive re-indexing**.

**Core Value Proposition:**
- ⚡ **Pre-compute once:** ~5 minutes upfront
- 🚀 **Test infinitely:** Instant switching between configs
- 📊 **Measure objectively:** Automatic evaluation with multiple metrics
- 💰 **Save money:** Test before deploying expensive configs

**Target Users:**
- AI engineers building RAG systems
- Data scientists optimizing retrieval
- Product teams evaluating RAG quality
- Researchers comparing approaches

**Key Differentiators:**
- Pre-computation strategy (faster iteration)
- Multiple retrieval methods (dense, BM25, hybrid)
- Comprehensive evaluation (IR metrics + LLM judge)
- Cost transparency (know before you spend)
- Open source (customize for your needs)

---

*Last Updated: 2025-10-03*
*Version: 1.0.0*