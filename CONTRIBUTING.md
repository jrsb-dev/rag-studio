# Contributing to RAG Studio

Thank you for your interest in contributing to RAG Studio! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, constructive, and professional in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/rag-studio/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Python version, etc.)
   - Screenshots if applicable

### Suggesting Features

1. Check if the feature has been suggested in [Issues](https://github.com/yourusername/rag-studio/issues)
2. If not, create a new issue with:
   - Clear use case
   - Proposed solution
   - Why it's valuable for RAG Studio users

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linters
5. Commit with clear messages
6. Push to your fork
7. Open a Pull Request

## Development Setup

See [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed setup instructions.

### Quick Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/rag-studio.git
cd rag-studio

# Install dependencies
make install

# Start development environment
make dev

# Run tests
make test-backend

# Run linters
make lint
```

## Development Guidelines

### Backend (Python)

- Follow PEP 8 style guide
- Use type hints
- Write docstrings for all functions/classes
- Keep functions small and focused
- Use async/await for I/O operations

```python
# Good
async def create_project(self, project_data: ProjectCreate) -> Project:
    """Create a new project.

    Args:
        project_data: Project creation data

    Returns:
        Created project instance
    """
    project = Project(**project_data.model_dump())
    # ...
```

### Frontend (TypeScript)

- Follow TypeScript best practices
- Use functional components with hooks
- Keep components small and reusable
- Use TanStack Query for server state
- Follow the existing folder structure

```typescript
// Good
export function ProjectCard({ project }: { project: Project }) {
  const { mutate } = useDeleteProject()

  return (
    <div className="p-4 border rounded">
      <h3>{project.name}</h3>
      {/* ... */}
    </div>
  )
}
```

### Code Style

**Python:**
```bash
# Format code
poetry run black app/

# Lint code
poetry run ruff check app/

# Type check
poetry run mypy app/
```

**TypeScript:**
```bash
# Format & lint
pnpm lint

# Type check
pnpm type-check
```

### Testing

**Backend:**
```bash
cd packages/backend
poetry run pytest
```

**Frontend:**
```bash
cd packages/frontend
pnpm test
```

### Commit Messages

Use clear, descriptive commit messages:

```bash
# Good
git commit -m "Add support for semantic chunking in ChunkingService"
git commit -m "Fix: Handle empty documents in document parser"
git commit -m "Refactor: Extract embedding logic to separate service"

# Bad
git commit -m "fix stuff"
git commit -m "WIP"
```

### Branch Naming

Use descriptive branch names:

```bash
# Features
feature/semantic-chunking
feature/hybrid-search

# Bug fixes
fix/document-upload-error
fix/cors-configuration

# Refactoring
refactor/simplify-retrieval-service
```

## Project Structure

```
rag-studio/
├── packages/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── api/          # API endpoints
│   │   │   ├── core/         # Core RAG logic
│   │   │   ├── models/       # Database models
│   │   │   ├── schemas/      # Pydantic schemas
│   │   │   └── services/     # Business logic
│   │   └── tests/           # Backend tests
│   └── frontend/
│       ├── src/
│       │   ├── components/  # Reusable components
│       │   ├── pages/       # Page components
│       │   ├── hooks/       # Custom hooks
│       │   └── api/         # API client
│       └── tests/          # Frontend tests
└── docs/                   # Documentation
```

## Adding New Features

### Backend Feature

1. Create model (if needed) in `app/models/`
2. Create schema in `app/schemas/`
3. Implement service in `app/services/`
4. Add API endpoint in `app/api/`
5. Write tests in `tests/`
6. Update documentation

### Frontend Feature

1. Create component in `src/components/`
2. Add custom hook if needed in `src/hooks/`
3. Create page if needed in `src/pages/`
4. Update routing in `App.tsx`
5. Write tests
6. Update documentation

## Documentation

- Update README.md for major changes
- Update GETTING_STARTED.md for setup changes
- Add code comments for complex logic
- Update API documentation

## Questions?

Feel free to:
- Open an issue for questions
- Join discussions in pull requests
- Reach out to maintainers

Thank you for contributing to RAG Studio! 🙏
