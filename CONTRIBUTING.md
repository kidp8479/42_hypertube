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

## Commits

Commits are atomic: one logical change per commit, not a pile of unrelated
edits squashed together. Commit messages loosely follow the
`type: summary` convention used throughout this repo's history - `feat`,
`fix`, `chore`, `docs` - with the body explaining *why* when it's not
obvious from the diff alone.

Small, focused commits make `git log` and `git blame` actually useful
later, especially on a project touching this many different areas
(networking, streaming, auth, UI).

On a feature branch tied to a Linear issue, include the issue key in the
commit message: `type(HYP-N): summary` (e.g.
`feat(HYP-9): scaffold NestJS application`). This is on top of the
branch-name-based link Linear already infers - it reinforces the link and
helps the status auto-transition on merge. Commits on `main` outside of any
specific issue (early setup, this history included) don't need it.

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
