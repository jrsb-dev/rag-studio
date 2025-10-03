# RAG Studio

> **Open-source testing platform to discover what RAG approach works best for YOUR corpus.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 The Problem

Every corpus is different. Legal documents ≠ Customer support tickets ≠ Technical docs.

But everyone uses the same "default" RAG settings because:
- ❌ No way to test different approaches
- ❌ Testing requires hours of re-indexing
- ❌ No baseline to compare against
- ❌ No visibility into what's happening

**Result**: Suboptimal RAG systems everywhere.

## ✨ The Solution

**RAG Studio** lets you:

1. 📤 Upload YOUR documents (sample of 50-100)
2. 🔧 Define multiple configs to test
3. ⚡ Pre-compute once (~5 minutes)
4. 🧪 Test queries instantly
5. 📊 Compare results side-by-side
6. 🎓 Understand what works for YOUR corpus
7. 📦 Export winning config to production

Like **Lighthouse** for websites or **Postman** for APIs → **RAG Studio** tests YOUR corpus.

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started) & Docker Compose
- [pnpm](https://pnpm.io/) (for local development)
- OpenAI API key (for embeddings)

### Start with Docker

```bash
# Clone the repository
git clone https://github.com/yourusername/rag-studio.git
cd rag-studio

# Copy environment file and add your OpenAI API key
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start all services
docker-compose up -d

# Open browser
open http://localhost:5173
```

### Local Development

```bash
# Install frontend dependencies
pnpm install

# Install backend dependencies
cd packages/backend
poetry install
cd ../..

# Start PostgreSQL
docker-compose up postgres -d

# Start backend (in one terminal)
cd packages/backend
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start frontend (in another terminal)
cd packages/frontend
pnpm dev
```

## 🏗️ Architecture

**Monorepo structure** inspired by [n8n](https://github.com/n8n-io/n8n):

```
rag-studio/
├── packages/
│   ├── backend/        # Python (FastAPI + PostgreSQL + pgvector)
│   ├── frontend/       # TypeScript (React + Vite + TailwindCSS)
│   └── shared/         # Shared types & OpenAPI specs
├── docker-compose.yml
└── pnpm-workspace.yaml
```

### Tech Stack

**Backend:**
- FastAPI (async Python web framework)
- PostgreSQL 16 + pgvector (vector similarity search)
- SQLAlchemy 2.0 (async ORM)
- LangChain (chunking & document processing)
- OpenAI (embeddings)

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS + shadcn/ui (UI components)
- TanStack Query (state management)

## 📖 Documentation

- [Core Idea](./docs/core-idea.md) - Understanding the problem & solution
- [Technical Spec](./docs/core-spec.md) - Detailed architecture & implementation
- [API Documentation](http://localhost:8000/docs) - Interactive API docs (when running)

## 🛣️ Roadmap

- [x] MVP Foundation (Week 1-2)
- [ ] Core RAG Logic (Week 3-4)
- [ ] Frontend UI (Week 5-6)
- [ ] Experiments & Results (Week 7)
- [ ] Testing & Polish (Week 8-9)
- [ ] Public Launch (Week 10)

See [Technical Spec](./docs/core-spec.md#13-timeline) for detailed timeline.

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) file.

## 🙏 Acknowledgments

Inspired by:
- [n8n](https://github.com/n8n-io/n8n) - Monorepo architecture
- [LangChain](https://github.com/langchain-ai/langchain) - RAG ecosystem
- UC Berkeley RAG research - Problem validation

---

**Stop guessing. Start testing on YOUR corpus.**

Built with ❤️ by [Jeroen Breemhaar](https://github.com/yourusername)
