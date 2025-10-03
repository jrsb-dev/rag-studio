# RAG Studio Backend

FastAPI backend for RAG Studio - handles document processing, chunking, embedding, and retrieval.

## Tech Stack

- **FastAPI** - Modern async Python web framework
- **PostgreSQL + pgvector** - Vector similarity search
- **SQLAlchemy 2.0** - Async ORM
- **LangChain** - Document processing and chunking
- **OpenAI** - Embeddings API

## Development Setup

### Prerequisites

- Python 3.11+
- Poetry
- PostgreSQL with pgvector extension

### Install Dependencies

```bash
poetry install
```

### Environment Variables

Create a `.env` file:

```bash
DATABASE_URL=postgresql+asyncpg://ragstudio:ragstudio@localhost:5432/ragstudio
OPENAI_API_KEY=sk-your-key-here
CORS_ORIGINS=["http://localhost:5173"]
```

### Run Migrations

```bash
poetry run alembic upgrade head
```

### Start Development Server

```bash
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at http://localhost:8000

Interactive docs at http://localhost:8000/docs

## Project Structure

```
app/
├── api/          # API route handlers
├── core/         # Core RAG logic (chunking, embedding, retrieval)
├── models/       # SQLAlchemy models
├── schemas/      # Pydantic schemas
├── services/     # Business logic services
├── config.py     # Configuration
├── database.py   # Database setup
└── main.py       # FastAPI app
```

## Testing

```bash
poetry run pytest
```

## Code Quality

```bash
# Format code
poetry run black app/

# Lint code
poetry run ruff check app/
```
