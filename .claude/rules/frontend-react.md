---
paths:
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.tsx"
---

# React conventions (frontend)

Additions to ADR-0006 (routing, feature folders, split state) and
`CONTRIBUTING.md` > File naming. Those win where they cover a topic.

## Components

- Function components, named exports. A default export only where a tool
  expects one (the Vite scaffold entry, a library instance).
- Props are an exported `interface <Component>Props`.
- Inside a component, in this order: hooks, derived values, handlers,
  render.
- Size stays inside the ADR-0005 budget (component 120 lines). Over it:
  extract a sub-component or a hook.
- A prop passed through 3+ components that do not use it: use composition
  (`children`) or a context instead.
- List keys are a stable id from the data, never the array index.

## Hooks

- A hook does one thing and returns an object with named fields (a
  `[value, setter]` pair is the exception).
- Extract a hook when logic is reused, when a component holds more than
  three `useState` / `useEffect`, or when the logic deserves its own test.
- `useEffect` is for synchronising with something outside React. Not for
  fetching (that is TanStack Query) and not for copying props into state
  (derive the value during render).
- Never disable `react-hooks/exhaustive-deps`: fix the dependency.
- `useMemo` / `useCallback` only with a reason: a measurably expensive
  computation, or a stable reference a memoised child or another hook
  needs.

## Server state (TanStack Query)

- Every backend read is a `useQuery`, every write a `useMutation`, through
  `apiFetch`. No `fetch` + `useState` + `useEffect`.
- Query keys come from one key factory per feature, in
  `<feature>-queries.ts`, once the feature has more than one key:

  ```ts
  export const movieKeys = {
    all: ['movies'] as const,
    list: (filters: MovieFilters) => [...movieKeys.all, 'list', filters] as const,
    detail: (id: number) => [...movieKeys.all, 'detail', id] as const,
  };
  ```

- A mutation invalidates (or updates) exactly the keys whose data it
  changed.
- Infinite scroll uses `useInfiniteQuery`, not a page counter in
  `useState`.

## Screens that show data

Every data-driven screen handles three states besides success: loading,
empty (clear text, optional action), and error (message, retry when it
makes sense). An API error is branched on its HTTP status, not on the
message text.

## Text (i18n)

- Every visible string goes through `t()`, including `aria-label`, `alt`
  and `title`. Strings live in `<feature>-locale-<lang>.ts`, one key in
  every language.
- Keys are semantic (`movies.list.empty`), never the English sentence.
- A string several features share (the generic error, "loading") lives
  once in the `common` namespace: every feature namespace falls back to it
  (`fallbackNS` in `lib/i18n.ts`), so it is never copied per feature.
- Variables go through interpolation (`t('key', { count })`) and plurals
  through i18next plural keys (`_one` / `_other`), never string
  concatenation.
