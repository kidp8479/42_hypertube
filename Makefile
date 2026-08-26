.PHONY: help install install-backend install-frontend hooks-install \
        dev dev-backend dev-frontend \
        format format-backend format-frontend \
        format-check format-check-backend format-check-frontend \
        lint lint-backend lint-frontend \
        lint-check lint-check-backend lint-check-frontend \
        test build

help:
	@echo "Available targets:"
	@echo "  install         - install backend + frontend dependencies, set up git hooks"
	@echo "  dev-backend     - run backend in watch mode"
	@echo "  dev-frontend    - run frontend dev server"
	@echo "  format          - run Prettier (write) on backend + frontend"
	@echo "  format-check    - run Prettier (check only, no writes) on backend + frontend"
	@echo "  lint            - run ESLint (--fix) on backend + frontend"
	@echo "  lint-check      - run ESLint (check only, no writes) on backend + frontend"
	@echo "  test            - run backend unit tests"
	@echo "  build           - build backend + frontend for production"

install: install-backend install-frontend hooks-install

install-backend:
	cd backend && npm install

install-frontend:
	cd frontend && npm install

hooks-install:
	git config core.hooksPath .githooks

dev-backend:
	cd backend && npm run start:dev

dev-frontend:
	cd frontend && npm run dev

format: format-backend format-frontend

format-backend:
	cd backend && npm run format

format-frontend:
	cd frontend && npm run format

format-check: format-check-backend format-check-frontend

format-check-backend:
	cd backend && npm run format:check

format-check-frontend:
	cd frontend && npm run format:check

lint: lint-backend lint-frontend

lint-backend:
	cd backend && npm run lint

lint-frontend:
	cd frontend && npm run lint

lint-check: lint-check-backend lint-check-frontend

lint-check-backend:
	cd backend && npm run lint:check

lint-check-frontend:
	cd frontend && npm run lint:check

test:
	cd backend && npm run test

build:
	cd backend && npm run build
	cd frontend && npm run build
