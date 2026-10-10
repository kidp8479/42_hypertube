# Hypertube - frontend

React SPA built with Vite. Project overview, stack and setup are in the
[root README](../README.md); the architecture (declarative routing, feature
folders, TanStack Query for server state, Context + `useReducer` for auth)
is recorded in [ADR-0006](../docs/adr/0006-frontend-architecture.md).

## Layout

```
src/
├── main.tsx          # entry point
├── App.tsx           # the single route table (public routes + <RequireAuth> subtree)
├── app/              # provider stack
├── features/auth/    # auth state machine, guard, auth pages (login, register, OAuth)
├── lib/              # fetch wrapper (apiFetch), token accessor, QueryClient
└── test/             # Vitest setup and shared fixtures
e2e/                  # Playwright specs (real browser, against a running stack)
```

Files are kebab-case `<feature>-<descriptor>`, tests `.test.ts(x)`, styles
`.module.css` (`CONTRIBUTING.md` > File naming).

## API access

The browser only talks to its own origin: the Vite dev server proxies
`/api/*` to the backend and strips the prefix (`vite.config.ts`). The
target is `http://localhost:3000` for host dev and
`VITE_API_PROXY_TARGET=http://backend:3000` inside docker-compose.

## Scripts

Run from the repo root through `make`:

| Make target | npm script |
|---|---|
| `make dev-frontend` | `dev` (Vite dev server on :5173) |
| `make test-frontend` | `test` (Vitest, jsdom) |
| `make test-e2e` | `test:e2e` (Playwright; needs the stack already up, `E2E_BASE_URL` overrides the default `http://localhost:5173`) |
| `make lint-check-frontend` | `lint:check` (`--max-warnings 0`, ADR-0005) |
| `make typecheck-frontend` | `typecheck` |
