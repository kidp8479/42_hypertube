# 42 project rules

Not a fixed ruleset: a checklist to instantiate per project in that
project's own `CLAUDE.md`. What is eliminatory, what structure is imposed,
which security items bite: all of it varies by subject. This file is the
set of questions to answer; the answers live in the project `CLAUDE.md`.

Project-agnostic engineering practice is in `engineering.md` and applies
unchanged. This file is only the 42 layer.

## Source of truth

- The **subject PDF** and the **marking sheet** (grille d'évaluation) are
  authoritative. This file and the project `CLAUDE.md` are working
  summaries, never a substitute. Read both in full before the defense;
  where they diverge, the stricter reading wins.
- Subjects are versioned and dated. Re-confirm the exact rules on the
  intra before the final defense.
- Before treating a project as "acquired" for an RNCP sub-category, check
  the current XP thresholds and project counts on meta.intra.42.fr. Note
  the project's RNCP contribution (Titre, Option, sub-category) in its
  `CLAUDE.md`.

## Per-project checklist (answer in the project CLAUDE.md)

**Repo**
- Visibility: public or private? (some subjects require public, e.g. for
  a GitOps sync)
- Must the repo name contain a group member's login?
- Is a directory layout imposed by the subject? (e.g. `p1/ p2/ p3/`)

**Evaluation**
- The defense runs on the evaluated group's machine. Everything must run
  locally, reliably, reproducibly, not "it worked once". A setup script
  that installs every prerequisite is often expected.
- Solo or team: this drives VM names, repo name, and any "team member
  login" the subject asks for.

**Eliminatory constraints**
- Copy them verbatim from the subject and the marking sheet into the
  project `CLAUDE.md`, under a heading that says 0 if violated.
- Common ones on a web subject (confirm against the actual subject, do
  not assume):
  - zero console errors or warnings, browser and server, at defense time
  - no plaintext passwords in the database
  - no SQL injection possible
  - no HTML / JS injection possible
  - every form and every upload validated server-side
  - `.env` excluded from git, no secret ever committed
  - every route on another user's resource checks ownership, returns
    `403`, never a silent pass

**Test data**
- Seeded accounts for the defense: define them in the project `CLAUDE.md`
  (login plus where the password comes from). The `browser-e2e` subagent
  uses them.

## Defense preparation

- Keep `docs/defense/` current: a security checklist mapped to the code,
  a traceability table (subject requirement to where it is met), and a
  backlog of known gaps.
- A structural choice that only exists to satisfy the subject still gets
  an ADR: the reviewer will ask why.
- **Strip the agent tooling before the final submission.** `CLAUDE.md`
  and `.claude/` (standards, skills, hooks, agents) are working notes
  and tooling for building the project, not part of what gets handed in
  for the defense. They are tracked during development on purpose (see
  "Portability" below); right before the defense, remove them from the
  branch that will actually be evaluated:

  ```sh
  git rm -r CLAUDE.md .claude/
  git commit -m "chore: remove agent notes and tooling before defense"
  ```

  This is a normal commit, not a rewrite: both stay recoverable in git
  history if needed after the defense, they are just not present in the
  `HEAD` an evaluator would see. Put this step on the defense checklist
  itself (`docs/defense/README.md` or equivalent) so it is not something
  to remember from memory under end-of-project pressure.

## Portability (why CLAUDE.md is tracked at all)

- `CLAUDE.md` is gitignored by default in `42-project-template` (a fresh
  project's working notes start local-only). Track it deliberately
  (`git add -f CLAUDE.md`) when the project needs it to survive a
  `git clone` on another machine (home Docker / school Podman) - this is
  the normal case once a project is underway, not the exception.
- `.claude/` (vendored from `agentic-lab` via the template) is tracked
  normally, no gitignore involved - it is tooling, not notes, same
  category as `.vscode/` or `.githooks/`.
- Both are removed together right before the defense per the step above,
  so tracking them for portability during development creates no leak
  risk at submission time.
