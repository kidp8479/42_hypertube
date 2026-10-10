# Diagrams

Maintained diagrams of the system, kept in sync with the code as it
evolves. Start here to see how a flow works before reading its code.

## Index

One page per domain. Each page opens with a Mermaid **overview** of the
whole domain, then one detail diagram per flow. GitHub renders Mermaid
directly, so there is nothing to export.

| Domain | Page | Covers |
|---|---|---|
| Auth | [`auth.md`](auth.md) | overview, register (frontend), SPA session states, OAuth handshake, OAuth identity linking |

Domains still to come, each with its own page once built: video library
and search (HYP-13), torrent download (HYP-12), streaming and transcoding
(HYP-14), comments, public REST API (HYP-15).

Some domains also have an Excalidraw **poster**: a single large picture
for the defense deck or Linear, where the layout matters more than in
Mermaid.

| Poster | Domain page |
|---|---|
| [`auth-flow.png`](auth-flow.png) | [`auth.md`](auth.md) |

## Rule: a diagram in a PR lands here too

Every PR that touches a flow, a state machine or 3+ components carries a
Mermaid diagram in its description (PR template), **and** commits it to
the domain's page in the same PR: a new section, or an update of the
section it changes. The overview at the top of the page is updated too
when the change adds or removes a step from it. A PR description is read
once; this folder is what a newcomer gets shown.

- New domain: create `docs/diagrams/<domain>.md` with an overview first,
  and add it to the index above.
- Each detail section names the issues that built it and, if any, the ADR
  that records the decision.
- A diagram that no longer matches the code is fixed in the PR that
  changed the code, not later.

## Excalidraw posters

Each poster has three files:

| File | Role |
|---|---|
| `*.excalidraw` | **source of truth**, editable by anyone at excalidraw.com or with the VS Code Excalidraw extension |
| `*.png` | rendered view, embedded in docs / Linear / the defense deck |
| `*.py` | regeneration script (optional, see below) |

### Editing

Open the `.excalidraw` file, change it, save, and re-export the PNG:

```sh
# with the VS Code Excalidraw extension: "Export to PNG" from the editor
# or, headless:
node .claude/skills/excalidraw-diagrams/scripts/export_playwright.js \
  docs/diagrams/auth-flow.excalidraw docs/diagrams/auth-flow.png
```

First run only: `npm install` in `.claude/skills/excalidraw-diagrams/scripts/`,
then `npx playwright install chromium-headless-shell` there if the export
complains about a missing browser. Run from the repo root.

### Regenerating from the script

The `.py` scripts drive the repo's `excalidraw-diagrams` skill
(`.claude/skills/excalidraw-diagrams`). They are committed so a diagram
can be rebuilt deterministically after a code change, but they are not
required: the `.excalidraw` file stands on its own.

```sh
python3 docs/diagrams/auth-flow.py
node .claude/skills/excalidraw-diagrams/scripts/export_playwright.js \
  docs/diagrams/auth-flow.excalidraw docs/diagrams/auth-flow.png
```

### The loop, when the code changes

1. Edit the `.excalidraw` (or the `.py`).
2. Re-render the `.png`.
3. **Look at the `.png`** and check it: no overlapping boxes or arrows,
   arrows on the right sides, text not clipped, reading order obvious,
   colours consistent. Fix and re-render until clean.
4. Commit on the branch for the feature that changed the flow.
5. Refresh the mirrored Linear document's image (below).

### Published copies

`auth-flow` is mirrored in the Linear document **"Auth - architecture"**
(Hypertube project), embedded as a PNG and linked from Auth-labelled
issues. To refresh it after a change here: upload the new `.png` as an
attachment on an Auth issue, then update the `![](...)` URL in the
document. The natural cadence is "when the feature that changed the flow
merges", not every edit.

### Current posters

- **`auth-flow`** - create an account (`POST /users`), get a token
  (`POST /auth/login`), and the guard chain on every other route
  (`JwtAuthGuard`, `@Public()`, ownership check), and sign-in with 42 or
  GitHub (state cookie, callback, single-use exchange code, token, and the
  `?error=` redirect on any callback failure).
  Reflects HYP-10 + HYP-44 + HYP-46 + HYP-11 + HYP-53 + HYP-57. Backend
  legs only: the SPA side is in [`auth.md`](auth.md), adding it to the
  poster is HYP-51. Add reset-password / logout when they are built.
