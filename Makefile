# ---------------------------------------------------------------------------- #
# Configuration                                                                #
# ---------------------------------------------------------------------------- #

# Auto-detect the compose CLI: prefer the Docker Compose v2 plugin, fall
# back to podman-compose on machines that only have that (e.g. the school
# Podman setup). Override explicitly if needed, e.g. `make COMPOSE=podman-compose up`.
COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "podman-compose")

# The plain container CLI (for label-scoped cleanup that compose can't do
# portably): `docker` when the Compose v2 plugin is present, `podman` otherwise.
CONTAINER := $(if $(filter docker,$(firstword $(COMPOSE))),docker,podman)

# Host port of the edge proxy (HYP-71): the one way into the stack. Read from
# .env like compose does, 8443 when unset.
HTTPS_PORT := $(or $(shell sed -n 's/^HYPERTUBE_HTTPS_PORT=//p' .env 2>/dev/null | tail -1),8443)

# Compose derives the project name from the directory name; volumes are then
# named `<project>_<key>` on both docker compose and podman-compose.
PROJECT := $(notdir $(CURDIR))

.PHONY: help \
        install install-tooling install-backend install-frontend hooks-install \
        dev-backend dev-frontend \
        up down ps re \
        logs logs-backend logs-frontend logs-db \
        sh-backend sh-frontend psql be fe \
        migration-generate migration-run migration-revert migration-show \
        migration-check migration-adopt \
        clean fclean wipe-db \
        format format-backend format-frontend \
        format-check format-check-backend format-check-frontend \
        lint lint-backend lint-frontend \
        lint-check lint-check-backend lint-check-frontend \
        typecheck typecheck-backend typecheck-frontend \
        test test-backend test-frontend test-e2e test-api build check-docs doc verify \
        graphify

help:
	@echo "Setup"
	@echo "  install         - install root tooling (TypeScript LSP only), backend + frontend dependencies, set up git hooks"
	@echo ""
	@echo "Local dev (no containers)"
	@echo "  dev-backend     - backend in watch mode, NO DATABASE (db isn't exposed to"
	@echo "                    the host - use 'make up' for anything touching Postgres)"
	@echo "  dev-frontend    - frontend dev server (no DB needed)"
	@echo ""
	@echo "Container stack"
	@echo "  up              - compose up -d (db + backend + frontend)"
	@echo "  down            - compose down"
	@echo "  ps              - compose ps"
	@echo "  re              - fclean then up (full reset)"
	@echo "  logs[-backend|-frontend|-db]  - follow logs (all services, or one)"
	@echo "  sh-backend      - interactive shell in the backend container"
	@echo "  sh-frontend     - interactive shell in the frontend container"
	@echo "  psql            - psql prompt on the dev database"
	@echo "  be CMD=\"...\"     - run a command in the backend container (e.g. npx tsc --noEmit)"
	@echo "  fe CMD=\"...\"     - run a command in the frontend container"
	@echo ""
	@echo "Database migrations (in the backend container, ADR-0010)"
	@echo "  migration-generate NAME=add-x - write a migration from the entity changes"
	@echo "  migration-run / -revert / -show - apply, undo the last, list"
	@echo "  migration-check  - fail if an entity changed without a migration (CI runs it)"
	@echo "  migration-adopt  - mark the baseline as applied on a database created before migrations"
	@echo ""
	@echo "Cleanup"
	@echo "  clean           - stop and remove containers (keeps volumes + images)"
	@echo "  fclean          - clean + remove volumes (db, node_modules) and locally-built images"
	@echo "  wipe-db         - remove only the db container + its data volume (fast schema reset)"
	@echo ""
	@echo "Code quality (host-side)"
	@echo "  format[-check]   - Prettier, write (or check only) on backend + frontend"
	@echo "  lint[-check]     - ESLint, --fix (or check only) on backend + frontend"
	@echo "  typecheck        - tsc --noEmit on backend + frontend"
	@echo "  test             - backend + frontend unit tests"
	@echo "  test-api         - run the Bruno request collection (api/bruno) against a running backend"
	@echo "  build            - production build, backend + frontend"
	@echo "  check-docs       - doc drift check: links, dashes, env variables, indexes, cited routes vs controllers and Bruno"
	@echo "  doc              - generate backend code docs (Compodoc) into docs/backend"
	@echo "  graphify         - build a local code graph into graphify-out/ (needs the graphify CLI: uv tool install graphifyy)"
	@echo ""
	@echo "Full local gate"
	@echo "  verify           - format-check, lint-check, typecheck, test, build, check-docs (one command, read the result)"

# ---------------------------------------------------------------------------- #
# Setup                                                                        #
# ---------------------------------------------------------------------------- #

install: install-tooling install-backend install-frontend hooks-install

# Root install is editor tooling only: it gives the TypeScript LSP a compiler
# to find at the workspace root. backend/ and frontend/ build with their own.
install-tooling:
	npm install

install-backend:
	cd backend && npm install

install-frontend:
	cd frontend && npm install

hooks-install:
	git config core.hooksPath .githooks

# ---------------------------------------------------------------------------- #
# Local dev (no containers)                                                    #
# ---------------------------------------------------------------------------- #

dev-backend:
	cd backend && npm run start:dev

dev-frontend:
	cd frontend && npm run dev

# ---------------------------------------------------------------------------- #
# Container stack - lifecycle                                                  #
# ---------------------------------------------------------------------------- #

up:
	$(COMPOSE) up -d
	@echo "App: https://localhost:$(HTTPS_PORT) (self-signed certificate)"

down:
	$(COMPOSE) down

ps:
	$(COMPOSE) ps

re: fclean up

# ---------------------------------------------------------------------------- #
# Container stack - logs                                                       #
# ---------------------------------------------------------------------------- #

logs:
	$(COMPOSE) logs -f

logs-backend:
	$(COMPOSE) logs -f backend

logs-frontend:
	$(COMPOSE) logs -f frontend

logs-db:
	$(COMPOSE) logs -f db

# ---------------------------------------------------------------------------- #
# Container stack - run commands inside a running service (`make up` first)    #
# ---------------------------------------------------------------------------- #

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

# ---------------------------------------------------------------------------- #
# Container stack - cleanup                                                    #
# ---------------------------------------------------------------------------- #

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

# ---------------------------------------------------------------------------- #
# Database migrations (ADR-0010)                                               #
# ---------------------------------------------------------------------------- #
# The schema comes from backend/src/migrations only, applied at boot. They run
# in the backend container (the database is only reachable from there); the
# directory is bind-mounted, so a generated file appears on the host. TypeORM
# names the file <timestamp>-<name>.ts: it is renamed to the *.migration.ts
# role the app looks for, and formatted.

migration-generate:
	@test -n "$(NAME)" || { echo "usage: make migration-generate NAME=add-movies"; exit 1; }
	$(COMPOSE) exec backend npm run migration:generate -- src/migrations/$(NAME)
	@f=$$(ls -t backend/src/migrations/*-$(NAME).ts | head -1) && mv "$$f" "$${f%.ts}.migration.ts" \
	  && cd backend && npx prettier --write src/migrations >/dev/null && echo "Review the new migration in backend/src/migrations/ before committing it."

migration-run:
	$(COMPOSE) exec backend npm run migration:run

migration-revert:
	$(COMPOSE) exec backend npm run migration:revert

migration-show:
	$(COMPOSE) exec backend npm run migration:show

migration-check:
	$(COMPOSE) exec backend npm run migration:check

# A database created before the migrations existed (by `synchronize`) has the baseline's
# tables: record the baseline as applied without running it. Only for a
# database that predates the migrations (a fresh one runs the baseline itself).
migration-adopt:
	$(COMPOSE) exec backend npm run migration:run -- --fake

# ---------------------------------------------------------------------------- #
# Code quality - run on the host (fast; matches what the pre-commit hook uses) #
# ---------------------------------------------------------------------------- #

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

# ---------------------------------------------------------------------------- #
# Test / build / docs                                                          #
# ---------------------------------------------------------------------------- #

test: test-backend test-frontend

test-backend:
	cd backend && npm run test

test-frontend:
	cd frontend && npm run test

# Real-browser auth-flow coverage. Needs the stack already up (`make up`
# or `make dev-backend` + `make dev-frontend` in two shells) - this target
# does not start it, since it needs a real Postgres behind the backend.
test-e2e:
	cd frontend && E2E_BASE_URL=$${E2E_BASE_URL:-https://localhost:$(HTTPS_PORT)} npm run test:e2e

# Runs the Bruno collection (assertions included) against the running stack,
# through the edge proxy (https, self-signed certificate, hence --insecure).
# --disable-cookies: the refresh scenario (requests 26 to 34) sets its cookie in
# an explicit header, a jar would send a stale one on its own.
# HYPERTUBE_HTTPS_PORT is passed from .env. Needs the stack up (`make up`);
# npx fetches the CLI on first use, so it is not a project dependency. In the
# Bruno app, set HYPERTUBE_HTTPS_PORT in the process environment or edit the
# `local` environment. POST /users is rate-limited (10/h), a run uses 5: raise
# THROTTLE_LIMIT_MULTIPLIER in .env for dev - see api/bruno/collection.bru.
test-api:
	cd api/bruno && HYPERTUBE_HTTPS_PORT=$(HTTPS_PORT) npx --yes @usebruno/cli run --env local --insecure --disable-cookies

build:
	cd backend && npm run build
	cd frontend && npm run build

# Deterministic doc drift check (HYP-70): links, dashes, env variables, doc
# indexes, cited routes vs controllers and Bruno. Its own tests run first.
check-docs:
	node --test "scripts/**/*.test.mjs"
	node scripts/check-docs.mjs

verify: format-check lint-check typecheck test build check-docs

doc:
	cd backend && npm run doc

# Local, deterministic code graph (tree-sitter AST, no LLM, nothing leaves
# the machine). Needs the graphify CLI installed once: `uv tool install
# graphifyy`. --code-only skips
# docs/PDFs/images, which would need an LLM backend. Query it with
# `graphify explain "X"`, `graphify path "A" "B"`, `graphify god-nodes`, or
# open graphify-out/graph.html in a browser.
graphify:
	graphify extract . --code-only
	graphify cluster-only . --no-label
