# Contributing

Working notes for how this project is built day to day. Written for a
future me as much as anyone else.

## Workflow: one issue, one branch, one PR

Work is tracked in Linear. Each unit of work is an issue; each issue gets
its own branch (Linear suggests a branch name per issue) and its own pull
request. A GitHub↔Linear integration moves the issue's status
automatically: opening a branch/PR moves it to *In Progress*, merging moves
it to *Done*.

Drop a short comment on the Linear issue when there's meaningful progress
to log (not just at the end) - it keeps the issue's history useful instead
of a single "done" at the finish line.

### Keeping branches up to date

If `main` has moved forward while a feature branch is in progress, rebase
the feature branch onto `main` before opening (or before merging) the PR -
don't merge `main` into the feature branch. Merge commits are reserved for
the single moment a PR actually merges into `main`; everything before that
stays a clean, rebased line of commits.

## Commits

Commits are atomic: one logical change per commit, not a pile of unrelated
edits squashed together. Commit messages loosely follow the
`type: summary` convention used throughout this repo's history - `feat`,
`fix`, `chore`, `docs` - with the body explaining *why* when it's not
obvious from the diff alone.

Small, focused commits make `git log` and `git blame` actually useful
later, especially on a project touching this many different areas
(networking, streaming, auth, UI).

Every commit tied to a Linear issue includes the issue key:
`type(HYP-N): summary` (e.g. `feat(HYP-9): scaffold NestJS application`).
This is on top of the branch-name-based link Linear already infers - it
reinforces the link and helps the status auto-transition on merge.

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

## Testing

Ship a test with every new unit of behavior (endpoint, service method,
script) before merging it. Auth flows (register / login / reset / logout)
also get an e2e test.

Run the suite **host-side** (`make test`), not inside the backend
container - the container has a memory cap and Jest's workers get
OOM-killed there. Same for `make lint` / `make typecheck` / `make format`.

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
  it('is defined', () => { ... });

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
  is a real assertion.
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
  from the same folder (case is preserved - it is display text).
- One doc-comment on the class explaining what the payload is for; no
  per-field comments unless a rule is non-obvious (ex: why login has no
  password policy).
- Login/auth DTOs carry **no** password length or complexity rule beyond a
  size cap - the form must accept legacy credentials, and a policy hint only
  helps an attacker.

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

## Doc comments

Public surface (exported classes/methods, controllers, entities, scripts
called from outside) gets a doc comment; obvious private code does not.
Comment the *why*, not the *what* - a line restating the identifier name
earns nothing.

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

- **Linear** - issue tracking, milestones, priorities. Labels group issues
  by technical domain (auth, backend, frontend, torrent, security).
- **GitHub** - source of truth for code, pull requests, code review.
- **Slack** - day-to-day communication. A daily-log channel is used as a
  running journal (what got done/blocked each day) to keep context between
  work sessions. Native Slack integrations post GitHub activity and Linear
  status changes into dedicated channels.

## Security baseline (non-negotiable per the subject)

- No plaintext passwords in the database.
- No SQL injection surface - always use parameterized queries / the ORM,
  never string-concatenated SQL.
- No HTML/JS injection - sanitize/escape anything rendered from user input.
- Validate every form and file upload, both client- and server-side.
- `.env` is git-ignored; never commit a real secret. Use `.env.example`
  for documenting required variables with placeholder values (placeholders
  must satisfy the `env.validation` schema so a first boot fails loudly on
  intent, not on a malformed example).
- Auth endpoints (`login`, registration, and later `reset-password`) are
  rate-limited with `@nestjs/throttler` - a global ceiling plus a tight
  per-route `@Throttle`. Password hashing uses the pinned `ARGON2_OPTIONS`
  (ADR-0004), never the library defaults.
- Zero console errors/warnings - browser or server - at defense time.
