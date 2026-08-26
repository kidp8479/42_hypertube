.PHONY: help install install-backend install-frontend \
        dev dev-backend dev-frontend \
        format format-backend format-frontend \
        lint lint-backend lint-frontend \
        test build

help:
	@echo "Available targets:"
	@echo "  install         - install backend + frontend dependencies"
	@echo "  dev-backend     - run backend in watch mode"
	@echo "  dev-frontend    - run frontend dev server"
	@echo "  format          - run Prettier on backend + frontend"
	@echo "  lint            - run ESLint (--fix) on backend + frontend"
	@echo "  test            - run backend unit tests"
	@echo "  build           - build backend + frontend for production"

install: install-backend install-frontend

install-backend:
	cd backend && npm install

install-frontend:
	cd frontend && npm install

dev-backend:
	cd backend && npm run start:dev

dev-frontend:
	cd frontend && npm run dev

format: format-backend format-frontend

format-backend:
	cd backend && npm run format

format-frontend:
	cd frontend && npm run format

lint: lint-backend lint-frontend

lint-backend:
	cd backend && npm run lint

lint-frontend:
	cd frontend && npm run lint

test:
	cd backend && npm run test

build:
	cd backend && npm run build
	cd frontend && npm run build
