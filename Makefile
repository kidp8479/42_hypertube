.PHONY: help install dev format lint test build

help:
	@echo "Available targets:"
	@echo "  install  - install backend dependencies"
	@echo "  dev      - run backend in watch mode"
	@echo "  format   - run Prettier on backend source"
	@echo "  lint     - run ESLint (--fix) on backend source"
	@echo "  test     - run backend unit tests"
	@echo "  build    - build backend for production"

install:
	cd backend && npm install

dev:
	cd backend && npm run start:dev

format:
	cd backend && npm run format

lint:
	cd backend && npm run lint

test:
	cd backend && npm run test

build:
	cd backend && npm run build
