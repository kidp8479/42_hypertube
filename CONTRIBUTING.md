# Contributing

How work is done on this repo, as a reference. New here: start with
[`docs/onboarding.md`](docs/onboarding.md) (setup, day-one traps, the
overview of this page).

## Workflow: one issue, one branch, one PR

Each unit of work is a Linear issue, with its own branch (Linear's suggested
name) and its own PR. The GitHub-Linear integration moves the issue to *In
Progress* when a branch or PR opens and to *Done* when it merges, **even when
the PR only does part of the issue**: write "Part of HYP-N" in the PR, split
the rest into a child issue, or move the issue back after the merge. Log
meaningful progress as a comment on the issue, not only at the end.

### Keeping branches up to date

Rebase the feature branch onto `main`, never merge `main` into it. Merge
commits exist only for the PR merge itself.

Branch protection on `main` enforces it: every required check (`backend`,
`frontend`, `e2e`, `scan`, `docs`) must pass against the *current* `main`
(`required_status_checks.strict`), so a stale PR cannot merge. With several
PRs queued, merge one, rebase the next, let CI pass, merge it. Dependabot
rebases its own PRs when `main` moves, but not instantly: merge them one at a
time, and comment `@dependabot rebase` on one that is stuck.

### Diagrams

A PR that touches a flow, a state machine or 3+ components carries a
Mermaid diagram in its description **and** commits it to the domain's
page in `docs/diagrams/` (one page per domain, overview first). Rule and
index: [`docs/diagrams/README.md`](docs/diagrams/README.md).

### Docs stay true

A PR that changes behaviour updates, in the same PR, every page that
describes it: the README, this file, an ADR, a diagram, the defense packet.
Re-read the page for length while there: say what is true now, keep one place
per fact and link to it. Every document is listed in
[`docs/README.md`](docs/README.md); a new one is added there
(`make check-docs` fails otherwise).

## Commits

One logical change per commit. Messages are `type(HYP-N): summary` (`feat`,
`fix`, `chore`, `docs`, `refactor`, `test`, `build`), with a body explaining
*why* when the diff does not say it.

**Keep trailers tidy:** no tool-appended `Co-authored-by:` bot identities,
session backlinks or "generated with" footers, in commits or PR
descriptions. The `.githooks/commit-msg` hook trims them (`make install`
sets `core.hooksPath` to `.githooks`; check it on a new machine). The `No
assistant attribution` workflow fails a PR that carries one; it is not a
required check, but treat it as blocking. Human co-authors are kept.

## Before committing

```sh
make format
make lint
```

Both are wired into the shared VSCode workspace config
(`.vscode/settings.json`) to run automatically on save, so in practice this
is mostly a safety net rather than a manual step.

A git pre-commit hook (`.githooks/pre-commit`, enabled via `make install`)
runs `make format-check` and `make lint-check` before every commit and
blocks it if either fails - fix with `make format` / `make lint` and
re-commit. The same checks run in CI (`.github/workflows/ci.yml`) on every
push and pull request, alongside a secret scan
(`.github/workflows/gitleaks.yml`).

`make verify` runs the whole local gate in one go (format-check, lint-check,
typecheck, test, build, check-docs) and is the command to run before
declaring a change ready - it mirrors what CI checks, minus the e2e job.

`make check-docs` (`scripts/check-docs.mjs`, the `docs` CI job) checks the
docs against the code: links, dashes, env variables, indexes, and every
`METHOD /path` they cite (declared by a controller **and** called by a Bruno
request; a route cited before it is built goes in the `PLANNED` list of
`scripts/doc-checks/routes.mjs`). It warns on a page over 300 lines. Every
gate, job by job: [`docs/defense/ci.md`](docs/defense/ci.md).

`lint:check` runs with `--max-warnings 0`. On top of the usual rules it
enforces a complexity / size budget (function length, nesting depth,
cyclomatic and cognitive complexity, copy-paste, repeated literals) - a
net against AI-assistant over-code, see
[ADR-0005](docs/adr/0005-lint-complexity-budget.md). Over budget = split
the function or file, never disable the rule inline. The count is
monotone: it can only go down. When writing code with an agent, a local
`anti-slop` skill (agent tooling, not part of the submitted tree) holds the
same budget as an up-front checklist.

## Dependency updates (Dependabot)

Config: `.github/dependabot.yml`. Weekly, per ecosystem (npm backend, npm
frontend, npm root tooling, GitHub Actions). Dependabot alerts are on.

- **Dev-dependency minor/patch bumps are grouped** into one PR per
  ecosystem. Review the changelog, check CI is green, merge.
- **Semver-major bumps on `@nestjs/*`, `typescript`, `@types/node`,
  `eslint` / `@eslint/js` are ignored.** These are deliberate migrations,
  not a Dependabot merge (e.g. `@nestjs/core` 12 is the ESM line and
  breaks the current `ts-jest` setup; TypeScript 7 is the native-compiler
  rewrite; `@types/node` must track the Node runtime, not lead it). When
  we take one on: open an issue, remove that dependency's line from the
  `ignore:` block, let Dependabot reopen the PR, migrate on a branch.
- **Other majors (GitHub Actions, non-listed libs) are not ignored** -
  triage them individually; most action bumps are safe.
- Don't let the queue pile up - a stale queue hides the one bump that
  matters.
- **A security alert on a transitive dependency** is fixed with an npm
  `override`, same major when possible, never `npm audit fix --force`. Each
  one is listed with its reason and its exit in
  [`docs/deps/security-overrides.md`](docs/deps/security-overrides.md).

## Code conventions

Spec layout, file naming, DTOs, the database schema workflow, OpenAPI
annotations, HTTP status codes and doc comments:
[`docs/code-conventions.md`](docs/code-conventions.md). Read the matching
section before adding an endpoint, an entity or a spec.

## Testing

Ship a test with every new unit of behavior (endpoint, service method,
script) before merging it. Auth flows (register / login / reset / logout)
also get an e2e test.

Run the suite **host-side** (`make test`), not inside the backend
container - the container has a memory cap and Jest's workers get
OOM-killed there. Same for `make lint` / `make typecheck` / `make format`.

### API request collection

`api/bruno/` is a [Bruno](https://www.usebruno.com) collection: numbered
`.bru` files that share runtime variables, so the order matters. Add a
request (with its `assert` block for the status code) alongside each new
endpoint. `make test-api` runs it headless against the running stack,
through the edge proxy (`https://localhost:<HYPERTUBE_HTTPS_PORT>/api`, a
self-signed certificate, so the CLI runs with `--insecure`); the port comes
from `.env`. `POST /users` is capped at 10 per hour per
IP and one run registers 8 accounts, so set `THROTTLE_LIMIT_MULTIPLIER` (e.g. 100) in
`.env` for dev; it is forced to 1 when `NODE_ENV=production`. CI runs the
same `make test-api` in the `e2e` job, after Playwright, on every PR.

## Tools in use

- **Linear** for issues (labels by domain: auth, backend, frontend, torrent,
  security), **GitHub** for code and review, **Slack** for a daily log of
  each work session (`#hypertube-daily-log`), with GitHub and Linear activity
  posted to their own channels.
- **Graphify** (optional, `make graphify`, output git-ignored): a local code
  map built from the syntax tree, to trace the impact of a change
  (`graphify explain "X"`, `graphify path "A" "B"`). Install once with
  `uv tool install graphifyy`.

## Security baseline (non-negotiable per the subject)

The controls and their proofs are in
[`docs/defense/security-checklist.md`](docs/defense/security-checklist.md).
The rules a change must keep:

- No plaintext password: argon2id with the pinned `ARGON2_OPTIONS`
  (ADR-0004).
- No SQL string built from input: the ORM or bound parameters only.
- No HTML/JS injection: no `dangerouslySetInnerHTML`, JSON-only backend.
- Every form and upload validated, client- and server-side.
- Secrets only in `.env` (git-ignored); `.env.example` holds placeholders the
  boot rejects, so a missing secret fails loudly.
- Deny by default: the global `JwtAuthGuard` protects every route, and only
  `@Public()` opens one. Never protect routes one by one.
- A route that changes a user-owned row checks ownership from the token's user
  (`@CurrentUser()`) and answers 403 on a mismatch.
- Auth routes carry a named rate-limit policy (`config/throttle.config.ts`).
- No console error or warning, browser or server, at the defense.
