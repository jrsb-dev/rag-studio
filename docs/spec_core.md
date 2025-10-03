# RAG Studio - MVP Technical Specification

**Version:** 0.1.0  
**Last Updated:** October 2, 2025  
**License:** MIT

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Database Schema](#4-database-schema)
5. [Backend Structure](#5-backend-structure)
6. [Frontend Structure](#6-frontend-structure)
7. [API Specification](#7-api-specification)
8. [Docker Setup](#8-docker-setup)
9. [MVP Features](#9-mvp-features)
10. [User Flow](#10-user-flow)
11. [Development Workflow](#11-development-workflow)
12. [Success Metrics](#12-success-metrics)
13. [Timeline](#13-timeline)
14. [Post-MVP Roadmap](#14-post-mvp-roadmap)

---

## 1. Project Overview

### Goal
Build a self-hosted testing platform to discover what RAG approach works best for YOUR corpus.

### Core Value Proposition
**Test YOUR corpus with different RAG approaches in minutes, not hours.**

Every corpus is different:
- Legal documents ≠ Customer support tickets
- Technical docs ≠ Medical records
- Code documentation ≠ Marketing content

**Stop guessing. Start testing on YOUR data.**

### The Problem
Developers building RAG systems face an impossible choice:
- **Use default settings** → Ship suboptimal system
- **Test thoroughly** → Waste 20+ hours re-indexing

Questions they can't answer:
- "Is chunk size 512 right for MY documents?"
- "Which embedding model works for MY domain?"
- "Will this approach work for MY use case?"
- "Why is retrieval failing on MY corpus?"

**Result**: Everyone uses default configs and hopes for the best.

### The Solution
RAG Studio is a testing platform where you:
1. Upload YOUR documents (sample of 50-100)
2. Define multiple configs to test
3. Pre-compute once (~5 minutes)
4. Test queries instantly
5. Compare results side-by-side
6. Understand what works for YOUR corpus
7. Export winning config to production

**Like Lighthouse for websites or Postman for APIs → RAG Studio tests YOUR corpus**

### Key Features
- 🧪 **Test YOUR corpus** with different approaches
- ⚡ **Instant comparison** (no re-indexing)
- 📊 **Visual side-by-side** results
- 📈 **Corpus analysis** (understand your data)
- 🎓 **Educational** (learn why configs work)
- 🔒 **Self-hosted** (privacy-first)
- 🔧 **Framework agnostic** (export anywhere)

---

## 2. Technology Stack

### Backend
```yaml
Language: Python 3.11+
Framework: FastAPI
Database: PostgreSQL 16
Vector Extension: pgvector
ORM: SQLAlchemy 2.0
Async: asyncio + asyncpg
Embeddings: OpenAI SDK / sentence-transformers
Chunking: LangChain / LlamaIndex / unstructured
PDF Parser: pypdf / unstructured
Task Queue: asyncio (MVP), Celery (future)
```

**Why Python?**
- Native access to RAG ecosystem (LangChain, LlamaIndex, RAGAS)
- Best chunking libraries (semantic-text-splitter, unstructured)
- Scientific computing stack (numpy, pandas)
- Easy to extend with advanced features

### Frontend
```yaml
Framework: React 18 + TypeScript
Build Tool: Vite
Styling: TailwindCSS
Components: shadcn/ui
Charts: Recharts
State Management: TanStack Query (React Query)
Routing: React Router
HTTP Client: Axios
Form Handling: React Hook Form
```

### Database
```yaml
Primary: PostgreSQL 16
Vector Extension: pgvector
Connection Pool: asyncpg
Migrations: Alembic
```

**Why PostgreSQL + pgvector?**
- Single database for both metadata and vectors
- ACID guarantees
- Mature, reliable, excellent Docker support
- Built-in full-text search
- JSONB for flexible schemas
- Easy backups

### Infrastructure
```yaml
Containerization: Docker
Orchestration: Docker Compose
Reverse Proxy: Nginx (production)
Package Manager: Poetry (backend), pnpm (frontend)
```

---

## 3. Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP/WebSocket
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     Frontend (Vue 3)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │
│  │  Project   │  │  Config    │  │    Experiment      │   │
│  │  Manager   │  │  Builder   │  │     Runner         │   │
│  └────────────┘  └────────────┘  └────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                     REST API
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Backend (FastAPI)                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  API Routes                          │   │
│  │  /projects  /documents  /configs  /experiments      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Services Layer                      │   │
│  │  Document │ Config │ Chunking │ Embedding │ Retrieval│  │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Core Logic                          │   │
│  │  ChunkingService │ EmbeddingService │ RetrievalService│  │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                    SQL + Vector
                         │
┌────────────────────────▼────────────────────────────────────┐
│              PostgreSQL + pgvector                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   Metadata   │  │    Vectors   │  │   Experiments    │ │
│  │  (projects,  │  │   (chunks +  │  │    (results)     │ │
│  │   configs)   │  │  embeddings) │  │                  │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
rag-studio/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI application
│   │   ├── config.py                  # Configuration
│   │   ├── database.py                # Database connection
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── projects.py            # Project endpoints
│   │   │   ├── documents.py           # Document endpoints
│   │   │   ├── configs.py             # Config endpoints
│   │   │   ├── queries.py             # Query endpoints
│   │   │   └── experiments.py         # Experiment endpoints
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── chunking.py            # Chunking strategies
│   │   │   ├── embedding.py           # Embedding generation
│   │   │   ├── retrieval.py           # Retrieval logic
│   │   │   ├── evaluation.py          # Scoring/metrics
│   │   │   └── document_parser.py     # PDF/text parsing
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── project.py             # SQLAlchemy models
│   │   │   ├── document.py
│   │   │   ├── config.py
│   │   │   ├── chunk.py
│   │   │   ├── query.py
│   │   │   ├── experiment.py
│   │   │   └── result.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── project.py             # Pydantic schemas
│   │   │   ├── document.py
│   │   │   ├── config.py
│   │   │   ├── query.py
│   │   │   ├── experiment.py
│   │   │   └── result.py
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── project_service.py
│   │       ├── document_service.py
│   │       ├── config_service.py
│   │       ├── query_service.py
│   │       └── experiment_service.py
│   ├── alembic/                       # Database migrations
│   │   ├── env.py
│   │   └── versions/
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_chunking.py
│   │   ├── test_embedding.py
│   │   └── test_retrieval.py
│   ├── pyproject.toml                 # Poetry dependencies
│   ├── Dockerfile
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── DocumentUpload.tsx
│   │   │   ├── ConfigBuilder.tsx
│   │   │   ├── QueryList.tsx
│   │   │   ├── ExperimentRunner.tsx
│   │   │   └── ResultsComparison.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Projects.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── Documents.tsx
│   │   │   ├── Configs.tsx
│   │   │   ├── Queries.tsx
│   │   │   ├── Experiments.tsx
│   │   │   └── Results.tsx
│   │   ├── routes/
│   │   │   └── index.tsx
│   │   ├── hooks/
│   │   │   ├── useProjects.ts
│   │   │   ├── useConfigs.ts
│   │   │   └── useExperiments.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

## 4. Database Schema

### PostgreSQL + pgvector Schema

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_project_id ON documents(project_id);

-- Configs table
CREATE TABLE configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  chunk_strategy VARCHAR(50) NOT NULL,    -- 'fixed', 'semantic', 'recursive'
  chunk_size INTEGER,
  chunk_overlap INTEGER,
  embedding_model VARCHAR(100) NOT NULL,  -- 'openai-ada-002', 'cohere-v3'
  retrieval_strategy VARCHAR(50) NOT NULL, -- 'dense', 'hybrid', 'bm25'
  top_k INTEGER DEFAULT 5,
  settings JSONB,                          -- Additional settings
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_configs_project_id ON configs(project_id);

-- Chunks table (pre-computed for all configs)
CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES configs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),                  -- OpenAI ada-002 dimensions
  metadata JSONB,
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_config_id ON chunks(config_id);

-- pgvector index for fast similarity search
CREATE INDEX idx_chunks_embedding ON chunks 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Queries table
CREATE TABLE queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  ground_truth TEXT,                       -- Optional expected answer
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_queries_project_id ON queries(project_id);

-- Experiments table
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255),
  config_ids UUID[] NOT NULL,              -- Array of config IDs to test
  query_ids UUID[] NOT NULL,               -- Array of query IDs to test
  status VARCHAR(50) DEFAULT 'pending',    -- 'pending', 'running', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_experiments_project_id ON experiments(project_id);
CREATE INDEX idx_experiments_status ON experiments(status);

-- Results table
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES configs(id),
  query_id UUID NOT NULL REFERENCES queries(id),
  retrieved_chunk_ids UUID[] NOT NULL,     -- Array of chunk IDs retrieved
  score REAL,                               -- Similarity/relevance score
  latency_ms INTEGER,                       -- Query latency
  metadata JSONB,                           -- Additional metrics
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_results_experiment_id ON results(experiment_id);
CREATE INDEX idx_results_config_id ON results(config_id);
CREATE INDEX idx_results_query_id ON results(query_id);

-- Trigger to update updated_at on projects
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 5. Backend Structure

### Key Components

#### 5.1 Core Services

**ChunkingService** (`app/core/chunking.py`)
```python
from typing import List
from langchain.text_splitter import RecursiveCharacterTextSplitter

class ChunkingService:
    """Handle document chunking with different strategies."""
    
    def chunk_fixed(
        self, 
        text: str, 
        chunk_size: int = 512, 
        overlap: int = 50
    ) -> List[str]:
        """Fixed-size chunking with overlap."""
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        return splitter.split_text(text)
    
    def chunk_semantic(self, text: str) -> List[str]:
        """Semantic chunking (future)."""
        raise NotImplementedError("Semantic chunking not yet implemented")
```

**EmbeddingService** (`app/core/embedding.py`)
```python
from typing import List
import numpy as np
from openai import AsyncOpenAI

class EmbeddingService:
    """Generate embeddings for text chunks."""
    
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)
    
    async def embed_batch(
        self, 
        texts: List[str], 
        model: str = "text-embedding-ada-002"
    ) -> List[np.ndarray]:
        """Generate embeddings for multiple texts."""
        response = await self.client.embeddings.create(
            model=model,
            input=texts
        )
        return [np.array(item.embedding) for item in response.data]
```

**RetrievalService** (`app/core/retrieval.py`)
```python
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import numpy as np

from app.models.chunk import Chunk

class RetrievalService:
    """Retrieve relevant chunks using vector similarity."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def search(
        self,
        query_embedding: np.ndarray,
        config_id: str,
        top_k: int = 5
    ) -> List[Chunk]:
        """Search for similar chunks using pgvector."""
        # Convert numpy array to list for pgvector
        embedding_list = query_embedding.tolist()
        
        query = (
            select(Chunk)
            .where(Chunk.config_id == config_id)
            .order_by(
                Chunk.embedding.cosine_distance(embedding_list)
            )
            .limit(top_k)
        )
        
        result = await self.db.execute(query)
        return result.scalars().all()
```

#### 5.2 API Routes

**Projects API** (`app/api/projects.py`)
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.schemas.project import ProjectCreate, ProjectResponse
from app.services.project_service import ProjectService

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new project."""
    service = ProjectService(db)
    return await service.create_project(project)

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db)
):
    """List all projects."""
    service = ProjectService(db)
    return await service.list_projects()

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get project by ID."""
    service = ProjectService(db)
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
```

#### 5.3 Dependencies

**pyproject.toml**
```toml
[tool.poetry]
name = "rag-studio-backend"
version = "0.1.0"
description = "RAG experimentation backend"
authors = ["Your Name <you@example.com>"]

[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.104.0"
uvicorn = {extras = ["standard"], version = "^0.24.0"}
sqlalchemy = "^2.0.0"
asyncpg = "^0.29.0"
alembic = "^1.12.0"
pydantic = "^2.5.0"
pydantic-settings = "^2.1.0"
python-multipart = "^0.0.6"
openai = "^1.3.0"
langchain = "^0.1.0"
pypdf = "^3.17.0"
numpy = "^1.26.0"
pgvector = "^0.2.3"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
pytest-asyncio = "^0.21.0"
httpx = "^0.25.0"
black = "^23.11.0"
ruff = "^0.1.6"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

---

## 6. Frontend Structure

### Key Components

**ConfigBuilder.tsx**
```tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'

interface ConfigForm {
  name: string
  chunkSize: number
  chunkOverlap: number
  embeddingModel: string
  topK: number
}

export default function ConfigBuilder({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [config, setConfig] = useState<ConfigForm>({
    name: '',
    chunkSize: 512,
    chunkOverlap: 50,
    embeddingModel: 'openai-ada-002',
    topK: 5
  })

  const createConfigMutation = useMutation({
    mutationFn: (data: ConfigForm) => 
      api.post(`/projects/${projectId}/configs`, data),
    onSuccess: () => {
      // Invalidate and refetch configs
      queryClient.invalidateQueries({ queryKey: ['configs', projectId] })
      // Reset form
      setConfig({
        name: '',
        chunkSize: 512,
        chunkOverlap: 50,
        embeddingModel: 'openai-ada-002',
        topK: 5
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createConfigMutation.mutate(config)
  }

  return (
    <div className="config-builder">
      <h2 className="text-2xl font-bold mb-4">Create RAG Configuration</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label className="block text-sm font-medium mb-1">
            Configuration Name
          </label>
          <input 
            value={config.name}
            onChange={(e) => setConfig({...config, name: e.target.value})}
            type="text" 
            required 
            className="w-full border rounded px-3 py-2"
          />
        </div>
        
        <div className="form-group">
          <label className="block text-sm font-medium mb-1">
            Chunk Size
          </label>
          <select 
            value={config.chunkSize}
            onChange={(e) => setConfig({...config, chunkSize: Number(e.target.value)})}
            className="w-full border rounded px-3 py-2"
          >
            <option value={256}>256 tokens</option>
            <option value={512}>512 tokens</option>
            <option value={1024}>1024 tokens</option>
            <option value={2048}>2048 tokens</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="block text-sm font-medium mb-1">
            Chunk Overlap
          </label>
          <input 
            value={config.chunkOverlap}
            onChange={(e) => setConfig({...config, chunkOverlap: Number(e.target.value)})}
            type="number" 
            min="0"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        
        <div className="form-group">
          <label className="block text-sm font-medium mb-1">
            Embedding Model
          </label>
          <select 
            value={config.embeddingModel}
            onChange={(e) => setConfig({...config, embeddingModel: e.target.value})}
            className="w-full border rounded px-3 py-2"
          >
            <option value="openai-ada-002">OpenAI Ada-002</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="block text-sm font-medium mb-1">
            Top K Results
          </label>
          <select 
            value={config.topK}
            onChange={(e) => setConfig({...config, topK: Number(e.target.value)})}
            className="w-full border rounded px-3 py-2"
          >
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </div>
        
        <button 
          type="submit"
          disabled={createConfigMutation.isPending}
          className="w-full bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
        >
          {createConfigMutation.isPending ? 'Creating...' : 'Create Configuration'}
        </button>
        
        {createConfigMutation.isError && (
          <p className="text-red-600 text-sm">
            Error: {createConfigMutation.error.message}
          </p>
        )}
      </form>
    </div>
  )
}
```

**ResultsComparison.tsx**
```tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'

interface ExperimentResults {
  experimentId: string
  configs: ConfigResult[]
}

interface ConfigResult {
  id: string
  name: string
  avgScore: number
  avgLatency: number
  results: QueryResult[]
}

interface QueryResult {
  queryId: string
  query: string
  chunks: Chunk[]
}

interface Chunk {
  id: string
  content: string
}

export default function ResultsComparison({ experimentId }: { experimentId: string }) {
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['experiment-results', experimentId],
    queryFn: () => api.get<ExperimentResults>(`/experiments/${experimentId}/results`),
    refetchInterval: 5000, // Refresh every 5s while experiment is running
  })

  if (isLoading) {
    return <div>Loading results...</div>
  }

  if (error) {
    return <div>Error loading results: {error.message}</div>
  }

  const configs = results?.data.configs || []

  return (
    <div className="results-comparison">
      <h2 className="text-2xl font-bold mb-4">Experiment Results</h2>
      
      <div className="config-comparison grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configs.map((config) => (
          <div key={config.id} className="config-column border rounded p-4">
            <h3 className="text-xl font-semibold mb-3">{config.name}</h3>
            
            <div className="metrics space-y-2 mb-4">
              <div className="metric flex justify-between">
                <span className="label text-gray-600">Avg Score:</span>
                <span className="value font-bold">
                  {config.avgScore.toFixed(2)}
                </span>
              </div>
              <div className="metric flex justify-between">
                <span className="label text-gray-600">Avg Latency:</span>
                <span className="value font-bold">
                  {config.avgLatency}ms
                </span>
              </div>
            </div>
            
            <div className="query-results space-y-3">
              {config.results.map((result) => (
                <div 
                  key={result.queryId}
                  className="result-card border rounded p-3 bg-gray-50"
                >
                  <p className="query font-medium mb-2">{result.query}</p>
                  <div className="chunks space-y-2">
                    {result.chunks.map((chunk) => (
                      <div 
                        key={chunk.id}
                        className="chunk text-sm text-gray-700 bg-white p-2 rounded"
                      >
                        {chunk.content.substring(0, 100)}...
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**useProjects.ts** (Custom Hook)
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'

interface Project {
  id: string
  name: string
  description?: string
  created_at: string
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects')
  })
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => api.get<Project>(`/projects/${projectId}`),
    enabled: !!projectId
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}
```

---

## 7. API Specification

### Base URL
```
http://localhost:8000/api
```

### Endpoints

#### Projects

**POST /projects**
```json
Request:
{
  "name": "My RAG App",
  "description": "Testing configs for customer support bot"
}

Response: 201
{
  "id": "uuid",
  "name": "My RAG App",
  "description": "Testing configs for customer support bot",
  "created_at": "2025-10-02T10:00:00Z"
}
```

**GET /projects**
```json
Response: 200
[
  {
    "id": "uuid",
    "name": "My RAG App",
    "created_at": "2025-10-02T10:00:00Z"
  }
]
```

**GET /projects/{project_id}**
```json
Response: 200
{
  "id": "uuid",
  "name": "My RAG App",
  "description": "Testing configs...",
  "document_count": 10,
  "config_count": 3,
  "created_at": "2025-10-02T10:00:00Z"
}
```

#### Documents

**POST /projects/{project_id}/documents**
```
Content-Type: multipart/form-data

files: File[]

Response: 201
{
  "uploaded": 10,
  "failed": 0,
  "documents": [
    {
      "id": "uuid",
      "filename": "doc1.pdf",
      "file_size": 1024000
    }
  ]
}
```

**GET /projects/{project_id}/documents**
```json
Response: 200
[
  {
    "id": "uuid",
    "filename": "doc1.pdf",
    "file_type": "application/pdf",
    "file_size": 1024000,
    "created_at": "2025-10-02T10:00:00Z"
  }
]
```

#### Configs

**POST /projects/{project_id}/configs**
```json
Request:
{
  "name": "Config A",
  "chunk_strategy": "fixed",
  "chunk_size": 512,
  "chunk_overlap": 50,
  "embedding_model": "openai-ada-002",
  "retrieval_strategy": "dense",
  "top_k": 5
}

Response: 201
{
  "id": "uuid",
  "name": "Config A",
  "chunk_strategy": "fixed",
  "chunk_size": 512,
  "chunk_overlap": 50,
  "embedding_model": "openai-ada-002",
  "retrieval_strategy": "dense",
  "top_k": 5,
  "status": "processing",
  "created_at": "2025-10-02T10:00:00Z"
}
```

**GET /projects/{project_id}/configs**
```json
Response: 200
[
  {
    "id": "uuid",
    "name": "Config A",
    "chunk_strategy": "fixed",
    "chunk_size": 512,
    "status": "ready",
    "chunk_count": 1500
  }
]
```

#### Queries

**POST /projects/{project_id}/queries**
```json
Request:
{
  "query_text": "What are the main features?",
  "ground_truth": "The main features are X, Y, and Z"
}

Response: 201
{
  "id": "uuid",
  "query_text": "What are the main features?",
  "ground_truth": "The main features are X, Y, and Z",
  "created_at": "2025-10-02T10:00:00Z"
}
```

#### Experiments

**POST /projects/{project_id}/experiments**
```json
Request:
{
  "name": "Config Comparison Test",
  "config_ids": ["uuid1", "uuid2", "uuid3"],
  "query_ids": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5"]
}

Response: 201
{
  "id": "uuid",
  "name": "Config Comparison Test",
  "status": "running",
  "created_at": "2025-10-02T10:00:00Z"
}
```

**GET /experiments/{experiment_id}**
```json
Response: 200
{
  "id": "uuid",
  "name": "Config Comparison Test",
  "status": "completed",
  "config_count": 3,
  "query_count": 5,
  "created_at": "2025-10-02T10:00:00Z",
  "completed_at": "2025-10-02T10:05:00Z"
}
```

**GET /experiments/{experiment_id}/results**
```json
Response: 200
{
  "experiment_id": "uuid",
  "configs": [
    {
      "config_id": "uuid1",
      "config_name": "Config A",
      "avg_score": 0.85,
      "avg_latency_ms": 250,
      "results": [
        {
          "query_id": "uuid",
          "query_text": "What are the main features?",
          "score": 0.92,
          "latency_ms": 230,
          "chunks": [
            {
              "id": "uuid",
              "content": "The main features include...",
              "score": 0.95
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 8. Docker Setup

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ragstudio
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-ragstudio}
      POSTGRES_DB: ragstudio
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ragstudio"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql+asyncpg://ragstudio:${POSTGRES_PASSWORD:-ragstudio}@postgres:5432/ragstudio
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CORS_ORIGINS=http://localhost:3000
    ports:
      - "8000:8000"
    volumes:
      - upload-data:/app/uploads
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000

volumes:
  postgres-data:
  upload-data:
```

### Backend Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry

# Copy dependency files
COPY pyproject.toml poetry.lock ./

# Install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-dev --no-interaction --no-ansi

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Build application
RUN pnpm build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### .env.example
```bash
# Database
POSTGRES_PASSWORD=ragstudio

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# Backend
DATABASE_URL=postgresql+asyncpg://ragstudio:ragstudio@postgres:5432/ragstudio
CORS_ORIGINS=http://localhost:3000

# Frontend
VITE_API_URL=http://localhost:8000
```

---

## 9. MVP Features

### ✅ Included in MVP

#### 9.1 Corpus Analysis & Insights

**Automatic Document Analysis:**
- Upload documents → automatic analysis
- Document statistics (count, avg length, type distribution)
- Structure detection (paragraphs, sections, code blocks)
- Language complexity scoring
- Content type classification

**Suggested Configurations:**
- Based on corpus characteristics
- "Your docs are technical → try larger chunks"
- "Your docs have clear structure → semantic chunking may work"
- Explain WHY suggestions are made

**Example Output:**
```
📊 Corpus Analysis:
├─ 87 documents uploaded
├─ Avg length: 1,250 words
├─ Type: Technical documentation (85% confidence)
├─ Structure: Well-organized (headers detected)
└─ Language: Complex (college reading level)

💡 Suggested Configs:
Config A (Recommended): Chunk 1024, Recursive
  → Why: Technical docs with clear structure benefit from larger, hierarchical chunks
  
Config B (Alternative): Chunk 512, Fixed
  → Why: Ensures consistent chunk size for predictable retrieval
```

#### 9.2 Project Management
- Create project
- List projects
- View project details
- Delete project
- Project dashboard with stats

#### 9.3 Document Management
- Upload documents (PDF, TXT, MD only)
- View document list with previews
- Maximum 100 documents per project
- Automatic text extraction
- Document quality warnings (too short, no structure, etc.)

#### 9.4 Configuration Builder

**Visual Config Builder:**
- **Chunking:** Fixed size only (256, 512, 1024, 2048 tokens)
- **Overlap:** Configurable (0-200 tokens)
- **Embeddings:** OpenAI ada-002 only
- **Retrieval:** Dense (cosine similarity) only
- **Top-K:** Configurable (3, 5, 10)

**Educational Tooltips:**
- Hover over "Chunk Size" → See explanation + visual
- Hover over "Overlap" → Understand when to use it
- Hover over "Top-K" → Learn trade-offs

**Pre-computation Status:**
- Show progress during pre-compute
- Estimated time remaining
- Cancel/retry options

#### 9.5 Query Management
- Add test queries manually
- Optional ground truth answers
- Edit/delete queries
- Import queries from CSV
- Suggested starter queries based on corpus

#### 9.6 Experiment Runner

**Test Execution:**
- Select 2-5 configs to test
- Select queries to test (or all)
- Run all queries against all configs
- Show progress in real-time
- Simple scoring (cosine similarity)

**Live Results:**
- See results as they come in
- Real-time latency metrics
- Immediate comparison

#### 9.7 Results Viewer

**Side-by-Side Comparison:**
- Visual grid of all configs
- Metrics per config (avg score, latency)
- Retrieved chunks shown per query
- Highlight best performing config

**Per-Query Analysis:**
- Show retrieved chunks for each config
- Why did Config B win? (explanation)
- Which queries failed? (debugging help)

**Visual Understanding:**
- Color-coded scores (green=good, red=bad)
- Chunk overlap visualization
- Similarity heatmap

#### 9.8 Educational Features

**Concept Explanations:**
- "What is chunking?" → Interactive demo
- "What are embeddings?" → Visual representation
- "How does retrieval work?" → Animated walkthrough

**Tooltips Everywhere:**
- Every metric explained
- Every config option explained
- Every result interpreted

**Learning Mode:**
- Optional tutorial on first use
- "Why is this happening?" buttons
- Link to docs for deep dives

#### 9.9 Export & Integration

**Export Winning Config:**
- Export as JSON
- Generate LangChain code snippet
- Generate LlamaIndex code snippet
- Include all settings + rationale

**Example Export:**
```python
# LangChain snippet for your winning config
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings

# Based on RAG Studio testing:
# Config B scored 0.85 avg across 10 queries
# Best for: Technical documentation corpus
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1024,
    chunk_overlap=100,
    separators=["\n\n", "\n", ". ", " ", ""]
)

embeddings = OpenAIEmbeddings(model="text-embedding-ada-002")
```

### ❌ Excluded from MVP

**Advanced Analysis:**
- Semantic chunking
- Multiple embedding providers (Cohere, Voyage)
- Hybrid retrieval (dense + sparse)
- Re-ranking
- Advanced metrics (RAGAS integration)

**Community Features:**
- User accounts / authentication
- Config sharing
- Community config library
- Rating system
- Comments/discussions

**Production Features:**
- Multi-tenancy
- Cloud hosting
- Team workspaces
- SSO integration
- API rate limiting
- Caching layer
- Advanced monitoring

**Advanced Testing:**
- Auto-generated test queries (synthetic data)
- A/B testing in production
- Continuous evaluation
- Regression testing

---

## 10. User Flow

### Complete MVP User Journey

```
1. Start Application
   └─> docker-compose up -d
   └─> Open http://localhost:3000
   └─> See landing page with "Try it now"

2. Create Project
   └─> Click "New Project"
   └─> Enter name: "Customer Support Bot"
   └─> Enter description (optional)
   └─> Click "Create"

3. Upload Documents
   └─> Navigate to Documents tab
   └─> See "Upload to test YOUR corpus"
   └─> Drag & drop 10-50 PDF/TXT files
   └─> Wait for parsing (1-2 min)
   └─> See document list with preview

4. Analyze Corpus (NEW!)
   └─> RAG Studio automatically analyzes:
       ├─ "87 documents, avg 1,250 words"
       ├─ "Type: Technical documentation"
       ├─ "Structure: Well-organized"
       └─> "Language: Complex (college level)"
   └─> Shows suggested configs:
       ├─ Config A: Chunk 1024 (Recommended)
       ├─ Config B: Chunk 512 (Alternative)
       └─> Explains WHY each is suggested

5. Create Configurations
   └─> Navigate to Configs tab
   └─> See suggested configs from analysis
   └─> Create Config A (use suggestion):
       ├─ Name: "Large Chunks (Recommended)"
       ├─ Chunk Size: 1024
       ├─ Overlap: 100
       └─> Top-K: 5
       └─> Hover tooltips explain each setting
   └─> Create Config B (customize):
       ├─ Name: "Small Chunks"
       ├─ Chunk Size: 512
       ├─ Overlap: 50
       └─> Top-K: 5
   └─> Create Config C (alternative):
       ├─ Name: "Minimal Overlap"
       ├─ Chunk Size: 1024
       ├─ Overlap: 0
       └─> Top-K: 10
   └─> Wait for pre-computation (2-5 min per config)
   └─> See "Ready to test" status

6. Add Test Queries
   └─> Navigate to Queries tab
   └─> See suggested starter queries based on corpus type
   └─> Add your own queries:
       ├─ "What are the main features?"
       ├─ "How do I get started?"
       ├─ "What is the pricing?"
       ├─ "How do I contact support?"
       └─> "What integrations are available?"
   └─> Optional: add expected answers (ground truth)

7. Run Experiment
   └─> Navigate to Experiments tab
   └─> Click "New Experiment"
   └─> Name: "Initial Config Test"
   └─> Select all 3 configs
   └─> Select all 5 queries
   └─> Click "Run Experiment"
   └─> Watch progress bar:
       ├─ "Testing Config A... (1/3)"
       ├─ "Testing Config B... (2/3)"
       └─> "Testing Config C... (3/3)"
   └─> See real-time results appearing (30 seconds total)

8. View & Understand Results
   └─> Navigate to Results tab
   └─> See side-by-side comparison:
       ├─ Config A: Avg Score 0.85, Latency 250ms ⭐ WINNER
       ├─ Config B: Avg Score 0.78, Latency 230ms
       └─> Config C: Avg Score 0.81, Latency 280ms
   └─> Click "Why did Config A win?" 
       └─> See explanation:
           "Config A (1024 chunks, 100 overlap) performed best because:
            - Your technical docs benefit from larger context windows
            - The overlap captured important cross-references
            - Retrieval precision improved with fuller chunks"
   └─> Drill into specific query:
       └─> Click "What are the main features?"
       └─> See retrieved chunks from each config
       └─> Understand why Config A retrieved better chunks
   └─> Visual heatmap shows similarity scores

9. Learn & Iterate
   └─> Click "What is chunk overlap?" tooltip
   └─> See interactive visualization
   └─> Understand the concept
   └─> Create Config D with new insight:
       └─> Name: "Optimized from learnings"
       └─> Settings based on what you learned
   └─> Run new experiment
   └─> Compare again

10. Export Config
    └─> Click "Export Config A"
    └─> Choose export format:
        ├─ LangChain (Python)
        ├─ LlamaIndex (Python)
        └─> JSON (Universal)
    └─> Download code snippet
    └─> See deployment guide
    └─> Copy-paste into YOUR production code

11. Use in Production
    └─> Implement winning config in your app
    └─> Deploy with confidence
    └─> Know it's optimized for YOUR corpus
```

### Key Differences from Original Flow

**Added Steps:**
- ✅ **Corpus Analysis** (automatic insights)
- ✅ **Suggested Configs** (smart defaults)
- ✅ **Educational Tooltips** (learn as you go)
- ✅ **Result Explanations** (understand why)
- ✅ **Interactive Learning** (iterate with knowledge)

**Enhanced Steps:**
- Upload → Now with quality warnings
- Create Configs → Now with suggestions + tooltips
- View Results → Now with explanations + visualizations
- Export → Now with code snippets + deployment guide

---

## 11. Development Workflow

### Initial Setup

```bash
# Clone repository
git clone https://github.com/yourusername/rag-studio.git
cd rag-studio

# Copy environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
nano .env
```

### Backend Development

```bash
cd backend

# Install Poetry (if not installed)
curl -sSL https://install.python-poetry.org | python3 -

# Install dependencies
poetry install

# Activate virtual environment
poetry shell

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest

# Format code
black app/
ruff check app/
```

### Frontend Development

```bash
cd frontend

# Install pnpm (if not installed)
npm install -g pnpm

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run linter
pnpm lint
```

### Docker Development

```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Remove volumes (clean slate)
docker-compose down -v

# Rebuild specific service
docker-compose build backend
docker-compose up backend
```

### Database Management

```bash
# Create new migration
cd backend
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# Connect to database
docker-compose exec postgres psql -U ragstudio -d ragstudio

# Backup database
docker-compose exec postgres pg_dump -U ragstudio ragstudio > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U ragstudio ragstudio
```

---

## 12. Success Metrics

### Technical Metrics

**Performance:**
- ✅ Document processing: 100 docs in <5 minutes
- ✅ Config pre-computation: 1000 chunks in <3 minutes
- ✅ Experiment execution: 5 queries × 3 configs in <30 seconds
- ✅ Query latency: <500ms per retrieval

**Resource Usage:**
- ✅ Docker image size: <1GB total
- ✅ Memory usage: <2GB RAM
- ✅ Database size: <500MB for 100 docs
- ✅ Disk I/O: Minimal (cached embeddings)

**Reliability:**
- ✅ Uptime: 99%+ (self-hosted)
- ✅ Error rate: <1%
- ✅ Data persistence: 100%
- ✅ Concurrent users: 5+ (MVP)

### User Experience Metrics

**Ease of Use:**
- ✅ Complete first experiment in <10 minutes
- ✅ Config creation in <2 minutes
- ✅ Results clearly comparable
- ✅ Export works in LangChain/LlamaIndex

**Value Delivered:**
- ✅ Find optimal config without manual testing
- ✅ Save 10+ hours of re-indexing time
- ✅ Confidence in production deployment
- ✅ Reproducible experiments

### Community Metrics (Post-Launch)

**Adoption:**
- 🎯 100 GitHub stars in first month
- 🎯 10 community contributions
- 🎯 50+ Docker pulls per week
- 🎯 Active discussions in issues

**Feedback:**
- 🎯 Net Promoter Score >30
- 🎯 <5 critical bugs reported
- 🎯 Feature requests prioritized
- 🎯 Documentation rated helpful

---

## 13. Timeline

### Week 1-2: Backend Foundation
**Goal:** Core backend structure and database

- [x] Project structure setup
- [x] FastAPI application skeleton
- [x] Database models (SQLAlchemy)
- [x] Pydantic schemas
- [x] Database migrations (Alembic)
- [x] Basic CRUD endpoints (projects, documents)
- [x] Docker setup for PostgreSQL + pgvector

**Deliverable:** Backend API with project/document CRUD

---

### Week 3-4: Core RAG Logic
**Goal:** Chunking, embedding, and retrieval

- [ ] Document parser (PDF, TXT, MD)
- [ ] Fixed chunking implementation
- [ ] OpenAI embedding integration
- [ ] Vector storage in PostgreSQL
- [ ] Retrieval service (cosine similarity)
- [ ] Config creation endpoint
- [ ] Background task for pre-computation

**Deliverable:** Working RAG pipeline backend

---

### Week 5-6: Frontend Foundation
**Goal:** UI for project and config management

- [ ] Vue 3 + Vite setup
- [ ] TailwindCSS + shadcn-vue
- [ ] Project list/detail views
- [ ] Document upload component
- [ ] Config builder form
- [ ] API client integration
- [ ] State management (Pinia)

**Deliverable:** Frontend for document upload and config creation

---

### Week 7: Experiments & Results
**Goal:** Run experiments and view results

- [ ] Query management endpoints
- [ ] Experiment runner service
- [ ] Results aggregation
- [ ] Query management UI
- [ ] Experiment runner UI
- [ ] Results comparison view
- [ ] Export functionality

**Deliverable:** Complete experiment workflow

---

### Week 8: Integration & Testing
**Goal:** End-to-end testing and bug fixes

- [ ] Integration tests
- [ ] Performance testing
- [ ] Bug fixes
- [ ] Error handling improvements
- [ ] Loading states
- [ ] User feedback messages

**Deliverable:** Stable MVP

---

### Week 9: Polish & Documentation
**Goal:** Production-ready release

- [ ] Complete Docker setup
- [ ] README.md with quick start
- [ ] API documentation
- [ ] User guide
- [ ] Demo video/GIF
- [ ] License file
- [ ] Contributing guidelines

**Deliverable:** Release-ready package

---

### Week 10: Launch
**Goal:** Public release and feedback

- [ ] GitHub repository public
- [ ] Post on Hacker News
- [ ] Post on r/LangChain, r/LocalLLaMA
- [ ] Twitter announcement
- [ ] Discord/community setup
- [ ] Gather initial feedback
- [ ] Bug triage

**Deliverable:** v0.1.0 public release

---

## 14. Post-MVP Roadmap

### v0.2.0 - Enhanced Chunking (Month 2)
- Semantic chunking (semantic-text-splitter)
- Recursive chunking
- Paragraph-based chunking
- Custom separators

### v0.3.0 - Multiple Embeddings (Month 3)
- Cohere embeddings
- Voyage AI embeddings
- Sentence-transformers (local)
- Embedding model comparison

### v0.4.0 - Advanced Retrieval (Month 4)
- Hybrid search (dense + BM25)
- Parent-child retrieval
- Sentence-window retrieval
- MMR (Maximal Marginal Relevance)

### v0.5.0 - Re-ranking & Metrics (Month 5)
- Cohere rerank
- Cross-encoder reranking
- RAGAS metrics integration
- Faithfulness scoring
- Context precision/recall

### v0.6.0 - Auto Query Generation (Month 6)
- LLM-based query generation
- Synthetic dataset creation
- Ground truth generation
- Query templates

### v0.7.0 - Community Features (Month 7)
- User accounts (optional)
- Config sharing
- Community config library
- Rating system

### v0.8.0 - Cloud Version (Month 8)
- Managed hosting option
- Team workspaces
- SSO integration
- Usage analytics

### v1.0.0 - Production Ready (Month 10)
- API rate limiting
- Caching layer
- Advanced monitoring
- Enterprise features

---

## Appendix

### Frequently Asked Questions

**Q: Why PostgreSQL + pgvector instead of dedicated vector DB?**
A: Single database for everything, proven reliability, you already have experience with it, easier backups, ACID guarantees.

**Q: Why Python instead of Node.js?**
A: Native RAG ecosystem, best chunking libraries, scientific computing stack, easier to extend.

**Q: Can I use local embeddings instead of OpenAI?**
A: Yes, but not in MVP. v0.3.0 will add sentence-transformers support.

**Q: How do I migrate to production?**
A: Export your winning config JSON and use it in your RAG framework (LangChain/LlamaIndex).

**Q: Does this work with my existing RAG app?**
A: RAG Studio is for experimentation only. You test configs here, then use the winning config in your app.

**Q: What if I have more than 100 documents?**
A: MVP is limited to 100 docs. Sample your dataset or wait for v0.5.0 which removes limits.

---

### Contributing

See CONTRIBUTING.md for development guidelines.

### License

MIT License - see LICENSE file.

---

**End of Specification**