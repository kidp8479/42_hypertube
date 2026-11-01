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

`make check-docs` (`scripts/check-docs.mjs`, the `docs` CI job) is the doc
drift check: relative links resolve, no em / en dash, every variable the
backend requires is wired in compose, `.env.example` and the e2e job, the
ADR and diagram indexes list everything, every page is reachable from
`docs/README.md`, each `.excalidraw` has its `.png`,
and every `METHOD /path` cited in the docs is declared by a controller **and**
called by a request of `api/bruno/`. A route cited before it is built goes in
the `PLANNED` list of `scripts/doc-checks/routes.mjs`. It names the file and
line of each problem. It also **warns**, without failing, on a page over 300
lines (diagram pages excepted): such a page is probably two.

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
frontend, GitHub Actions).

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

### Spec file layout

Specs are co-located (`foo.service.ts` -> `foo.service.spec.ts`) and follow
one shape, so any spec reads the same way:

```
type FooDeps = { bar: jest.Mock };          // only the methods the spec drives
const buildThing = (overrides = {}) => ({ ...sensibleDefaults, ...overrides });

describe('FooService', () => {
  // shared setup
  let service: FooService;
  let deps: FooDeps;
  beforeEach(async () => { /* compile TestingModule, grab service + mocks */ });

  // tests, grouped by method
  describe('methodUnderTest', () => {
    it('does X when Y', async () => {
      // arrange
      // act
      // assert
    });
  });
});
```

- **Setup lives in the hooks, tests are the `it()`s.** The `beforeEach`
  block is the boundary: everything above it is wiring, everything below
  is a real assertion. No `it('is defined')`: if the wiring breaks, every
  other test of the file fails first.
- **One `describe` per method under test**, nested in the class-level
  `describe`. `it('...')` labels read as sentences
  (`methodUnderTest does X when Y`).
- **Mock only what the spec drives.** A local `type XMock = { ... }` listing
  just those methods; the DI fake is passed via `useValue`; retrieve it
  with `module.get<XMock>(token)` (real token, mock type - see
  `users.service.spec.ts`).
- **Fixtures come from a `buildX()` factory** at the top of the file.
  A test overrides only the fields it asserts on; the rest stay defaults.
- **Arrange / Act / Assert**, separated by blank lines, not comments.
- `clearMocks: true` is set globally (`package.json` -> `jest`), so mock
  call history resets between tests automatically.
- Call `await module.init()` after `.compile()` when the service has
  lifecycle hooks (`onModuleInit` etc.) - `.compile()` alone does not run
  them.
- Don't mock `argon2`; it's fast enough to hash/verify for real in a
  unit test, and a real hash catches bugs a stub would hide.

## File naming

Backend (`backend/src`): `<kebab-case-name>.<role>.ts`.

- The **hyphen** separates the words of the name: `cookie-state`,
  `normalize-email`, `oauth-account`.
- The **dot** separates the role: `.service`, `.controller`, `.module`,
  `.entity`, `.dto`, `.strategy`, `.guard`, `.decorator`, `.filter`,
  `.util`, `.interface`, `.store`, `.config`, `.validation`, `.exception`.
  The role is visible in the file tree and greppable (`*.strategy.ts`), and
  it is what the Nest CLI generates.
- A spec adds `.spec` after the role: `foo.service.spec.ts`.
- A new role is fine when no existing one fits, but reuse one first. The
  only file without a role is `main.ts`, Nest's bootstrap entry point.

Frontend (`frontend/src`): kebab-case, `<feature>-<descriptor>` inside a
feature folder, see
[ADR-0006](docs/adr/0006-frontend-architecture.md). Tests are `.test.ts(x)`;
styles are Tailwind classes in the component
([ADR-0012](docs/adr/0012-tailwind-css-v4-on-top-of-the-design-tokens.md)),
and a class list shared by several components is a `<name>-classes.ts`. `App.tsx` and `main.tsx` keep the Vite scaffold
names.

## API conventions (NestJS)

### DTOs

- **Every field is `readonly` and uses definite assignment (`email!: string`).**
  A DTO models an inbound request: it is read, never mutated. `readonly`
  encodes that and lets the compiler catch an accidental `dto.x = ...` in a
  handler; the `!` is still needed because `class-transformer` populates the
  instance, not a constructor.
- **Two-sided bounds use `@Length(min, max)`**, not separate `@MinLength` +
  `@MaxLength`. A one-sided cap stays a single `@MaxLength`.
- **Email is normalised** with `@NormalizeEmail()` (from
  `src/common/decorators/`) before `@IsEmail()`, on every DTO that carries
  an email, so lookups and uniqueness stay case-insensitive. Other
  free-text fields that must not keep surrounding whitespace use `@Trim()`
  from the same folder. The username keeps its case (display text) but is
  unique whatever the case: the index is on `LOWER(username)`.
- One doc-comment on the class explaining what the payload is for; no
  per-field comments unless a rule is non-obvious (ex: why login has no
  password policy).
- Login/auth DTOs carry **no** password length or complexity rule beyond a
  size cap - the form must accept legacy credentials, and a policy hint only
  helps an attacker.
- An "edit" DTO is `PartialType(CreateDto)` plus its own fields. A field
  that changes a credential (for `UpdateUserDto`, `email` and `password`)
  is re-authenticated in the service (`currentPassword`), and the change
  ends every other session.

### Database schema

The schema is built by migrations (`backend/src/migrations/`), applied by the
app at boot in every environment; `synchronize` is off (ADR-0010). When you
change an entity:

1. `make migration-generate NAME=add-movies` writes the migration from the
   difference between the entities and the database (the stack must be up).
2. **Read the generated SQL.** A column rename is generated as a drop and an
   add, which loses the data; rewrite it as a rename by hand.
3. Commit the migration with the entity change. `make migration-check` (and the
   `e2e` CI job) fails if an entity changed without one.

`make migration-run`, `-revert` and `-show` apply, undo the last and list them.

### OpenAPI (Swagger)

`/api-docs` is the REST evidence shown at the defense. The
`@nestjs/swagger` compiler plugin (`nest-cli.json`) builds the request and
response models from the DTO types and their class-validator rules, so a
DTO needs no `@ApiProperty`. A new route adds:

- `@ApiOperation({ summary })`: one short line for the evaluator, not the
  doc comment (which is for developers).
- `@ApiErrors(...)` (`common/decorators/`) with the error codes it answers,
  429 only on a throttled route.
- `@ApiOkResponse({ type })` when the handler returns a plain object, which
  the plugin cannot describe.

The bearer token is required on every operation unless the route is
`@Public()`, which also marks it public in the document. A browser
navigation (the OAuth routes) is left out with `@ApiExcludeEndpoint()`:
"Try it out" would fetch it and follow the redirect.

### HTTP status codes

Rely on Nest's default success code for the verb (`GET`/`PATCH`/`DELETE` -> 200,
`POST` -> 201). Add `@HttpCode(HttpStatus.OK)` **only** when the default is
semantically wrong - a `POST` that does not create a resource
(`POST /auth/login` returns a token, so it is 200). Use the `HttpStatus` enum,
never a bare number. Thrown `HttpException`s carry their own status and are
unaffected by `@HttpCode`.

A handler acting on a resource id that matches no row throws
`NotFoundException` (404) - never a 200 with an empty body, and never a
silent no-op on `PATCH`/`DELETE`. The check lives in the service (single
source of truth), not the controller.

A Postgres unique-constraint violation (`23505`) is mapped to **409** by
the global `QueryFailedFilter`, with a message that does not name the
clashing value - never let it surface as a raw 500 with the SQL error in
the body/logs.

## Doc comments

**Every class has a `/** */` doc comment**, with no exception for how
trivial it looks: modules, controllers, services, entities, DTOs,
strategies, guards, filters, exception classes. The same goes for every
React component. A defense reviewer and a developer onboarding on the
project both start from "what is this and why is it here"; the class
comment is the one place that answers it without opening the body. A module
or a one-method service still earns one line (its role and what it hands
to the rest of the app), never a restatement of its name.

Below the class, public surface (exported functions, public methods, HTTP
routes, scripts called from outside) gets a doc comment; obvious private
code does not. Comment the *why*, not the *what* - a line restating the
identifier name earns nothing.

The `//` header at the top of a file stays: it says what the *file* is for,
the class comment says what the *class* is for.

Syntax: `/** */` on declarations (class, method, function, exported
constant), because Compodoc reads it. `//` for comments inside a function
body or on a call (ex: the bootstrap in `main.ts`).

A comment states how the code behaves now, as a plain fact a reader with no
context can use. It never corrects an earlier claim ("not X, actually Y",
"no longer", "the old ...") and never tells a history: when a sentence turns
out wrong, rewrite it as the true statement. History belongs in the commit
message and in an ADR. A negation is fine when it is itself a property
("never logged", "not a fetch").

Prose carries the intent. JSDoc tags are added **only when they state
something the TypeScript signature does not**:

- `@throws` - TS has no throws in the type system, so which exception a
  method or route raises is real, missing information (ex: the 401 on
  `POST /auth/login`).
- `@param` - only for a precondition, unit, or invariant not in the type
  (ex: "must already be authenticated"). Never `@param foo the foo`.
- `@returns` - only when the meaning of the return is non-obvious (what a
  `null` signals, what a shape represents), not to repeat the type.
- `@example` - for a non-trivial call flow; Compodoc renders it.

Compodoc (`make doc`) turns these into the browsable API docs used as
defense evidence, so the tags that survive should read as documentation,
not decoration.

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
