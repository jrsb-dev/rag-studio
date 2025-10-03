.PHONY: help install dev build clean docker-up docker-down docker-clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	pnpm install
	cd packages/backend && poetry install

dev: ## Start development environment (Postgres only)
	docker-compose -f docker-compose.dev.yml up -d
	@echo "PostgreSQL is running. Start backend and frontend manually:"
	@echo "  Backend:  cd packages/backend && poetry run uvicorn app.main:app --reload"
	@echo "  Frontend: cd packages/frontend && pnpm dev"

build: ## Build all packages
	pnpm build

clean: ## Clean build artifacts
	pnpm run clean
	cd packages/backend && rm -rf dist __pycache__ .pytest_cache
	cd packages/frontend && rm -rf dist node_modules/.vite

docker-up: ## Start all services with Docker
	docker-compose up -d

docker-down: ## Stop all Docker services
	docker-compose down

docker-clean: ## Stop and remove all Docker data
	docker-compose down -v

docker-logs: ## Show Docker logs
	docker-compose logs -f

test-backend: ## Run backend tests
	cd packages/backend && poetry run pytest

lint: ## Run linters
	pnpm run lint
	cd packages/backend && poetry run black app/ && poetry run ruff check app/
