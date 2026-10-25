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
├── app/              # provider stack, language switcher and sync
├── features/auth/    # auth state machine, guard, auth pages (login, register, OAuth), auth strings (en/fr)
├── lib/              # fetch wrapper (apiFetch), token accessor, QueryClient, i18n setup and language rules
└── test/             # Vitest setup and shared fixtures
e2e/                  # Playwright specs (real browser, against a running stack)
```

Files are kebab-case `<feature>-<descriptor>`, tests `.test.ts(x)`, styles
Tailwind classes in the component, on the tokens of `src/styles/tokens.css`
(ADR-0012, `CONTRIBUTING.md` > File naming).

## API access

The browser only talks to its own origin and the API lives under `/api`. In
the compose stack the edge proxy (nginx, `proxy/`, ADR-0009) serves the app
on `https://localhost:8443` and routes `/api/*` to the backend, stripping the
prefix. For host dev (`make dev-frontend`) the Vite dev server does the same
(`vite.config.ts`) towards `http://localhost:3000`.

## Scripts

Run from the repo root through `make`:

| Make target | npm script |
|---|---|
| `make dev-frontend` | `dev` (Vite dev server on :5173) |
| `make test-frontend` | `test` (Vitest, jsdom) |
| `make test-e2e` | `test:e2e` (Playwright; needs the stack already up, `E2E_BASE_URL` overrides the default `https://localhost:8443`, the edge proxy) |
| `make lint-check-frontend` | `lint:check` (`--max-warnings 0`, ADR-0005) |
| `make typecheck-frontend` | `typecheck` |
