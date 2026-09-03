# Diagrams

Maintained diagrams of the system, kept in sync with the code as it
evolves. Each diagram has three files:

| File | Role |
|---|---|
| `*.excalidraw` | **source of truth**, editable by anyone at excalidraw.com or with the VS Code Excalidraw extension |
| `*.png` | rendered view, embedded in docs / Linear / the defense deck |
| `*.py` | regeneration script (optional, see below) |

## Editing

Open the `.excalidraw` file, change it, save, and re-export the PNG:

```sh
# with the VS Code Excalidraw extension: "Export to PNG" from the editor
# or, headless:
node ~/.claude/skills/excalidraw-diagrams/scripts/export_playwright.js \
  docs/diagrams/auth-flow.excalidraw docs/diagrams/auth-flow.png
```

## Regenerating from the script

The `.py` scripts drive the personal `excalidraw-diagrams` skill
(`~/.claude/skills/excalidraw-diagrams`). They are committed so a diagram
can be rebuilt deterministically after a code change, but they are not
required: the `.excalidraw` file stands on its own.

```sh
python3 docs/diagrams/auth-flow.py
node ~/.claude/skills/excalidraw-diagrams/scripts/export_playwright.js \
  docs/diagrams/auth-flow.excalidraw docs/diagrams/auth-flow.png
```

## The loop, when the code changes

1. Edit the `.excalidraw` (or the `.py`).
2. Re-render the `.png`.
3. **Look at the `.png`** and check it: no overlapping boxes or arrows,
   arrows on the right sides, text not clipped, reading order obvious,
   colours consistent. Fix and re-render until clean.
4. Commit on the branch for the feature that changed the flow.
5. Refresh the mirrored Linear document's image (below).

## Published copies

`auth-flow` is mirrored in the Linear document **"Auth - architecture"**
(Hypertube project), embedded as a PNG and linked from Auth-labelled
issues. To refresh it after a change here: upload the new `.png` as an
attachment on an Auth issue, then update the `![](...)` URL in the
document. The natural cadence is "when the feature that changed the flow
merges", not every edit.

## Current diagrams

- **`auth-flow`** - login (`POST /auth/login`) and the guard chain on every
  other route (`JwtAuthGuard`, `@Public()`, ownership check). Reflects
  HYP-10 + HYP-44. Add reset-password / logout when they are built.
