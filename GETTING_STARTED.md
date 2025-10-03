# Getting Started with RAG Studio

This guide will help you set up and start using RAG Studio locally.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** & **Docker Compose** (for easiest setup)
- **Node.js 20+** & **pnpm** (for frontend development)
- **Python 3.11+** & **Poetry** (for backend development)
- **OpenAI API Key** (for embeddings)

## Quick Start (Docker)

The fastest way to get started is using Docker Compose:

### 1. Clone the Repository

```bash
git clone https://github.com/jrsb-dev/rag-studio
cd rag-studio
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
nano .env
```

Add your OpenAI API key:
```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 3. Start Services

```bash
# Start all services (PostgreSQL + Backend + Frontend)
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### 5. Create Your First Project

1. Open http://localhost:5173 in your browser
2. Click "Get Started"
3. Create a new project
4. Upload your documents (PDF, TXT, or Markdown)
5. Create RAG configurations to test
6. Add test queries
7. Run experiments and compare results!

## Local Development Setup

For active development without Docker:

### 1. Install Dependencies

```bash
# Install frontend dependencies
pnpm install

# Install backend dependencies
cd packages/backend
poetry install
cd ../..
```

### 2. Start PostgreSQL

```bash
# Start only PostgreSQL with Docker
docker-compose up postgres -d
```

### 3. Setup Database

```bash
cd packages/backend

# Run migrations
poetry run alembic upgrade head

cd ../..
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd packages/backend
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd packages/frontend
pnpm dev
```

### 5. Access Development Environment

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Using the Makefile (Helper Commands)

We provide a Makefile with convenient commands:

```bash
# Install all dependencies
make install

# Start development environment (Postgres only)
make dev

# Build all packages
make build

# Start all services with Docker
make docker-up

# Stop Docker services
make docker-down

# Clean everything (including volumes)
make docker-clean

# Run backend tests
make test-backend

# Run linters
make lint

# Show all available commands
make help
```

## Project Structure

```
rag-studio/
├── packages/
│   ├── backend/        # FastAPI backend
│   └── frontend/       # React frontend
├── docs/              # Documentation
├── docker-compose.yml # Docker setup
└── .env              # Environment variables
```

## Workflow Example

Here's a typical workflow to test RAG configurations:

### 1. Create a Project

```bash
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My RAG Project",
    "description": "Testing configurations for customer support bot"
  }'
```

### 2. Upload Documents

Use the UI or API to upload PDF/TXT files to your project.

### 3. Create Configurations

Create multiple configurations to test:

```bash
# Config A: Small chunks
{
  "name": "Small Chunks",
  "chunk_strategy": "fixed",
  "chunk_size": 512,
  "chunk_overlap": 50,
  "embedding_model": "text-embedding-ada-002",
  "retrieval_strategy": "dense",
  "top_k": 5
}

# Config B: Large chunks
{
  "name": "Large Chunks",
  "chunk_strategy": "fixed",
  "chunk_size": 1024,
  "chunk_overlap": 100,
  "embedding_model": "text-embedding-ada-002",
  "retrieval_strategy": "dense",
  "top_k": 5
}
```

### 4. Add Test Queries

```bash
{
  "query_text": "How do I reset my password?",
  "ground_truth": "Visit the settings page and click 'Reset Password'"
}
```

### 5. Run Experiment

```bash
{
  "name": "Config Comparison",
  "config_ids": ["uuid-config-a", "uuid-config-b"],
  "query_ids": ["uuid-query-1", "uuid-query-2"]
}
```

### 6. View Results

Get experiment results to see which configuration performs better:

```bash
GET /api/experiments/{experiment_id}/results
```

## Troubleshooting

### Port Already in Use

If port 5432, 8000, or 5173 is already in use:

```bash
# Check what's using the port
lsof -i :5432
lsof -i :8000
lsof -i :5173

# Kill the process or change ports in docker-compose.yml
```

### Database Connection Error

```bash
# Ensure PostgreSQL is running
docker-compose ps

# Check database logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### OpenAI API Errors

Ensure your API key is correctly set in `.env`:

```bash
# Check environment variable
cat .env | grep OPENAI_API_KEY

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-your-key"
```

### Frontend Not Loading

```bash
# Check if backend is running
curl http://localhost:8000/health

# Check frontend logs
docker-compose logs frontend
# or for local dev
cd packages/frontend && pnpm dev
```

## Next Steps

- **Read the [Core Idea](./docs/core-idea.md)** to understand the problem RAG Studio solves
- **Check the [Technical Spec](./docs/core-spec.md)** for architecture details
- **Explore the API** at http://localhost:8000/docs
- **Contribute** by reading [CONTRIBUTING.md](./CONTRIBUTING.md)

## Getting Help

- **GitHub Issues**: https://github.com/yourusername/rag-studio/issues
- **Documentation**: See `/docs` folder
- **API Reference**: http://localhost:8000/docs

---

**Happy testing! 🚀**

Stop guessing. Start testing on YOUR corpus.
