# Defense packet

Everything an evaluator needs to grade Hypertube without spelunking the
codebase. Umbrella issue: **HYP-24**. Nothing here is generated - it is
written and kept current by hand as features land.

## Status

| Document | Purpose | State |
|----------|---------|-------|
| [`run-guide.md`](run-guide.md) | clone -> `.env` -> `make up` -> working app, on a fresh machine | todo |
| [`traceability.md`](traceability.md) | every subject requirement -> Linear issue -> code -> test; also where the eliminatory constraints live once `CLAUDE.md` is removed for the defense | ongoing |
| [`security-checklist.md`](security-checklist.md) | mechanism-level inventory of every security control + the accepted gaps | ongoing |
| [`rest-proof.md`](rest-proof.md) | endpoint x method x status-code table, REST constraints satisfied (subject asks for this explicitly) | todo |
| Architecture diagram | containers + data flow (Excalidraw, exported PNG/SVG here) | todo |
| ERD | database entities and relations | todo |
| Sequence diagrams | login, OAuth, password reset, "watch a movie" (search -> torrent -> stream) | todo |
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
