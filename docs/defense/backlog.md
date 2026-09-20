# Backlog - pending Linear issues

Work identified in a session that lacked the Linear MCP. Create the issue,
then delete the entry here.

_Currently empty - everything surfaced so far is ticketed:_

- HTTP security headers (helmet) -> HYP-28
- Structured logging (pino) -> HYP-29
- Validated config layout -> template (added to HYP-26)

## Not yet ticketed

- `GET /users` returns `email` / `firstName` / `lastName` for every user
  to any authenticated caller (surfaced writing `security-checklist.md`).
  The subject imposes the `/users` endpoint, so this is a modelling
  decision, not a straight bug: decide whether the list representation
  should be trimmed to public fields, then ticket or record as accepted.
- `main`'s history has 29 merge commits with diverged parents (crossing
  lines, not a clean ladder) - most PRs were never rebased onto `main`
  right before merging, contrary to `CONTRIBUTING.md`. Root cause fixed
  going forward: branch protection now enforces `required_linear_history`
  + up-to-date-before-merge on the 4 CI checks, so no new PR can land
  diverged. The existing 29 need a real interactive rebase to reparent
  cleanly (transcendence-style: every PR keeps its own merge commit, but
  none diverged) - the 6-way Dependabot batch merged in one sitting will
  hit real lockfile conflicts on replay and needs resolving by hand, not
  a scripted no-op. Investigated 2026-09-20; deferred, not attempted live
  on `main` - only a local, deleted `main-linear` branch was ever touched.
