# Defense packet

Everything an evaluator needs to grade Hypertube without digging through
the codebase. The rows still marked todo below are **HYP-59**. Nothing
here is generated: it is written and kept current by hand as features
land.

## Status

| Document | Purpose | State |
|----------|---------|-------|
| Run guide | clone -> `.env` -> `make up` -> working app, on a fresh machine | done in [`onboarding.md`](../onboarding.md) > Getting it running; a one-page evaluator version with HYP-59 |
| [`traceability.md`](traceability.md) | every subject requirement -> Linear issue -> code -> test; also where the eliminatory constraints live once `CLAUDE.md` is removed for the defense | ongoing |
| [`security-checklist.md`](security-checklist.md) | mechanism-level inventory of every security control + the accepted gaps | ongoing |
| [`security-review-2026-10-24.md`](security-review-2026-10-24.md) | `web-security-review` run over the auth surface, point by point, with its evidence | done - run again before HYP-16 |
| `rest-proof.md` | endpoint x method x status-code table, REST constraints satisfied (subject asks for this explicitly) | todo |
| Architecture diagram | containers + data flow | partial - containers and the request path in [`diagrams/network.md`](../diagrams/network.md); the full app once the core lands |
| ERD | database entities and relations | todo |
| [Sequence diagrams](../diagrams/) | login, OAuth, password reset, "watch a movie" (search -> torrent -> stream) | partial - auth (login, OAuth, refresh, logout, API keys) in `diagrams/auth.md`, language in `diagrams/i18n.md`, pictures in `diagrams/profile-pictures.md`; reset and "watch a movie" to come |
| App bootstrap diagram | startup order: env validation -> DB -> JWT -> listen (see ADR-0003) | todo |
| [`known-limitations.md`](known-limitations.md) | deliberate prod-vs-school gaps, owned not overlooked | ongoing |
| [`backlog.md`](backlog.md) | work identified but not yet a Linear issue | transient |
| Strip agent tooling (last step, see Notes) | remove `CLAUDE.md` and `.claude/` from the submitted branch | todo |
| [ADRs](../adr/) | structural decisions and their rationale | ongoing |
| Swagger (`/api-docs`) | live API reference | ongoing, keep annotations current |
| Compodoc (`make doc`) | code structure reference | generated |

## Notes

- Diagrams: draw in Excalidraw, commit the `.excalidraw` source **and** an
  exported `.png` (or `.svg`) so they render without the editor.
- Draw a flow only once the feature it describes is built - a half-done
  sequence diagram is rework.
- The traceability matrix is the highest-leverage document: it lets the
  evaluator tick their grid without hunting. Fill it incrementally, one row
  per feature as it merges.

## Before the defense: strip the agent tooling

`CLAUDE.md` and `.claude/` (standards, skills, hooks, agents) are working
notes and tooling for building the project, not part of what gets handed
in. They are tracked deliberately during development so they survive a
`git clone` between the home and school machines (see
`.claude/standards/school-42.md` > "Portability"). Right before the
branch that will actually be evaluated is final:

```sh
git rm -r CLAUDE.md .claude/
git commit -m "chore: remove agent notes and tooling before defense"
```

Normal commit, not a rewrite: both stay recoverable in git history, just
absent from the `HEAD` an evaluator sees. Do this last, after every other
row above is filled in - `CLAUDE.md` and the eliminatory-constraints
summary in it are useful reference material until then.
