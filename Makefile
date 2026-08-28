# Auto-detect the compose CLI: prefer the Docker Compose v2 plugin, fall
# back to podman-compose on machines that only have that (e.g. the school
# Podman setup). Override explicitly if needed, e.g. `make COMPOSE=podman-compose up`.
COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "podman-compose")

# The plain container CLI (for label-scoped cleanup that compose can't do
# portably): `docker` when the Compose v2 plugin is present, `podman` otherwise.
CONTAINER := $(if $(filter docker,$(firstword $(COMPOSE))),docker,podman)

# Compose derives the project name from the directory name; volumes are then
# named `<project>_<key>` on both docker compose and podman-compose.
PROJECT := $(notdir $(CURDIR))

.PHONY: help install install-backend install-frontend hooks-install \
        dev dev-backend dev-frontend \
        format format-backend format-frontend \
        format-check format-check-backend format-check-frontend \
        lint lint-check lint-check-backend lint-check-frontend \
        lint-backend lint-frontend \
        typecheck typecheck-backend typecheck-frontend \
        test build doc \
        up down ps logs logs-backend logs-frontend logs-db \
        sh-backend sh-frontend psql be fe \
        clean fclean wipe-db re

help:
	@echo "Available targets:"
	@echo "  install         - install backend + frontend dependencies, set up git hooks"
	@echo "  dev-backend     - run backend in watch mode, no containers, NO DATABASE"
	@echo "                    (db isn't exposed to the host - use 'make up' for"
	@echo "                    anything touching Postgres)"
	@echo "  dev-frontend    - run frontend dev server (no containers, no DB needed)"
	@echo "  up              - docker/podman compose up -d (db + backend + frontend)"
	@echo "  down            - docker/podman compose down"
	@echo "  ps              - docker/podman compose ps"
	@echo "  logs            - docker/podman compose logs -f (all services)"
	@echo "  logs-backend    - docker/podman compose logs -f backend"
	@echo "  logs-frontend   - docker/podman compose logs -f frontend"
	@echo "  logs-db         - docker/podman compose logs -f db"
	@echo "  sh-backend      - interactive shell in the backend container"
	@echo "  sh-frontend     - interactive shell in the frontend container"
	@echo "  psql            - psql prompt on the dev database"
	@echo "  be CMD=\"...\"     - run a command in the backend container (e.g. npx tsc --noEmit)"
	@echo "  fe CMD=\"...\"     - run a command in the frontend container"
	@echo "  clean           - stop and remove containers (keeps volumes + images)"
	@echo "  fclean          - clean + remove volumes (db, node_modules) and locally-built images"
	@echo "  wipe-db         - remove only the db container + its data volume (fast schema reset)"
	@echo "  re              - fclean then up (full reset)"
	@echo "  format          - run Prettier (write) on backend + frontend"
	@echo "  format-check    - run Prettier (check only, no writes) on backend + frontend"
	@echo "  lint            - run ESLint (--fix) on backend + frontend"
	@echo "  lint-check      - run ESLint (check only, no writes) on backend + frontend"
	@echo "  typecheck       - run tsc --noEmit on backend + frontend"
	@echo "  test            - run backend unit tests"
	@echo "  build           - build backend + frontend for production"
	@echo "  doc             - generate backend code docs (Compodoc) into docs/backend"

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

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f

logs-backend:
	$(COMPOSE) logs -f backend

logs-frontend:
	$(COMPOSE) logs -f frontend

logs-db:
	$(COMPOSE) logs -f db

# --- run things inside the running containers ----------------------------- #
# `exec` attaches to an already-running container, so `make up` first.

# Interactive shell in a service.
sh-backend:
	$(COMPOSE) exec backend sh

sh-frontend:
	$(COMPOSE) exec frontend sh

# psql prompt on the dev database, using the container's own credentials.
psql:
	$(COMPOSE) exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

# Run an arbitrary command in a service, e.g.
#   make be CMD="npx tsc --noEmit"
#   make be CMD="npm run lint"
#   make fe CMD="npm run build"
be:
	$(COMPOSE) exec backend $(CMD)

fe:
	$(COMPOSE) exec frontend $(CMD)

# --- cleanup --------------------------------------------------------------- #

# Stop and remove containers. Volumes (the database) and images are kept.
clean:
	$(COMPOSE) down --remove-orphans

# Also drop volumes (db_data + the node_modules volumes) and images built
# locally. `--rmi local` leaves pulled images like postgres:16-alpine alone,
# so the next `up` doesn't re-download them.
fclean:
	$(COMPOSE) down --volumes --remove-orphans --rmi local

# Reset just the database. `down` (no --volumes) removes every container but
# keeps all named volumes, so we then drop only db_data by name (portable:
# compose names volumes `<project>_db_data` on both docker and podman-compose).
# Much faster than fclean: the node_modules volumes and built images stay, so
# the next `up` needs no rebuild or npm ci - only the containers and a fresh
# database are recreated. `-` lets it pass when the volume isn't there.
wipe-db:
	$(COMPOSE) down
	-$(CONTAINER) volume rm $(PROJECT)_db_data
	@echo "Database gone. 'make up' recreates a fresh one."

re: fclean up

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

typecheck: typecheck-backend typecheck-frontend

typecheck-backend:
	cd backend && npm run typecheck

typecheck-frontend:
	cd frontend && npm run typecheck

test:
	cd backend && npm run test

build:
	cd backend && npm run build
	cd frontend && npm run build

doc:
	cd backend && npm run doc
