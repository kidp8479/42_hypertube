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
  for documenting required variables with placeholder values.
- Zero console errors/warnings - browser or server - at defense time.
