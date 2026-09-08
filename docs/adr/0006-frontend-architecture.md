# Frontend architecture: declarative routing, feature folders, split state

**Date:** 2026-09-08 · **Status:** accepted

The React SPA (`frontend/`) is built on four deliberate choices, settled in a
design and grilling session before any auth screen existed:

- **Routing:** `react-router-dom` v7 in its *declarative* form (`<BrowserRouter>`
  + a `<Routes>`/`<Route>` tree written as JSX in `src/App.tsx`). Not
  file-based routing (TanStack Router, Next.js app router), not the v7
  data-router with `loader`/`action` functions.
- **Folder layout:** by domain feature. `src/features/<domain>/` holds
  everything for that domain (state, hooks, pages, guards): `src/features/auth/`
  today, `src/features/movies/` and others later. Shared infrastructure with
  no domain lives in `src/lib/` (the fetch wrapper, the token accessor, the
  QueryClient); cross-cutting composition lives in `src/app/` (the provider
  stack). There is no `src/routes/` or `src/pages/` directory.
- **Server state:** TanStack Query (`@tanstack/react-query` v5). Every read of
  backend data goes through a `useQuery`/`useMutation`; nothing backend-owned
  is mirrored into React state by hand.
- **Client/auth state:** React Context + `useReducer`. The auth state machine
  (`loading` / `authenticated` / `anonymous`) is a pure reducer; `AuthProvider`
  wires it to the network. The JWT lives in `localStorage`, is read by the
  fetch wrapper at call time, and is never held in React state.

Access control is expressed in the route tree, not the filesystem: protected
routes are nested under a pathless `<Route element={<RequireAuth />}>`, and
`RequireAuth` renders `<Outlet />`, a redirect, or nothing depending on the
auth state. A file's location says which domain it belongs to, never whether
it is public.

## Why

- **The student starts a React/NestJS/TypeORM internship in ~10 days and is
  using this project to widen skills.** The guiding rule for the whole
  frontend: build the fundamentals by hand (a `fetch` wrapper, CSS, Context,
  routing) and adopt only the modern tools that are themselves internship
  skills (TanStack Query, Vitest). A file-based router or a data-router would
  hide exactly the routing mechanics worth learning.
- **Declarative routing keeps the route table in one readable place.** For an
  app this size (auth, movie library, video page, comments) the entire route
  tree fits on one screen in `App.tsx`. File-based routing pays off at dozens
  of routes; it is overhead here, and it couples the URL structure to the
  directory structure.
- **No data-router loaders: they overlap with TanStack Query.** Both solve
  "fetch before render". Running both means two caching models and two places
  data can come from. Query is the internship skill, so Query wins; the
  router just routes.
- **Feature folders scale with domain logic, not route count.** Hypertube's
  complexity is concentrated per domain (the BitTorrent client, transcoding,
  the comment system), not spread across many thin pages. Grouping by feature
  keeps each domain's state, hooks and screens together and lets a whole
  domain be reasoned about (or removed) as a unit.
- **Context + `useReducer` over a state library.** Auth state is one small
  state machine with four transitions. Redux/Zustand would be a dependency
  and a pattern to learn for no gain here. `useReducer` is a React fundamental
  and keeps the transition logic pure and unit-testable without React.
- **Token in `localStorage`, read only by the wrapper.** Keeping it out of
  React state means there is exactly one source of truth and no re-render
  storm on login/logout; the trade-off (XSS can read `localStorage`) is
  accepted for a project with a strict input-sanitisation requirement and no
  third-party script surface. Revisit if that changes.

## Consequences

- `src/App.tsx` is the single route table. A new protected page is a
  `<Route>` nested under the existing `<RequireAuth>`; a new public page is a
  top-level `<Route>`. Reviewers check access control by reading that one
  file.
- Router symbols are imported from `react-router-dom` only, never mixed with
  `react-router` (v7 re-exports both and mixing them can yield two context
  instances).
- A new domain is a new `src/features/<domain>/` folder. A page component
  living beside auth state (e.g. `HomePage` in `features/auth/`) is fine while
  it is the auth flow's landing point; it moves to its own feature when it
  grows one.
- File naming inside a feature: kebab-case, `<feature>-<descriptor>`
  (`auth-context.ts`, `auth-guard.tsx`, `auth-login-page.tsx`). The feature
  prefix is redundant with the folder but keeps a flat editor tab list and
  fuzzy-finder readable. `.tsx` means "contains a component", `.ts` means
  "logic only" (types, reducers, hooks, context) - enforced in spirit by
  `react-refresh/only-export-components`, which forbids a `.tsx` file from
  exporting non-components.
- The 401-anywhere path is centralised: the singleton `QueryClient`'s cache
  `onError` routes a 401 to a handler `AuthProvider` registers, which clears
  the token and flags the session expired; `RequireAuth` then redirects.
- Not covered here and deferred to their own ADRs: the one-click logout token
  strategy (HYP-35), and the eventual styling-system decision (CSS Modules is
  the current default, not yet ADR-worthy).
