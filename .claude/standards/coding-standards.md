# Coding standards (reviewer-enforced)

Rules a review agent checks and can act on - not implementer-facing
prose. Read by `diff-auditor` and other review-time agents/skills, not by
the default context an implementing agent works from. Humans: the
workflow these back is in `engineering.md`; this file is the checklist,
not the explanation.

Source of the split: Matt Pocock's 3-layer system against AI slop PRs
(AI Engineer Paris 2026, see `agentic-lab`'s
`docs/agentic-workflow-reference.md` 2.2) - the implementer's context is
already overloaded (explore + change files + debug); the reviewer has
room, so standards go here, read once per review, not baked into every
turn of every task.

## Auto-fixable (mechanical, safe to change without asking)

- Non-English inline comment or string literal comment -> translate to
  English in place.
- Stray debug `console.log` / `print` left in code -> remove it.

A reviewer agent with write access fixes these directly instead of
leaving a comment. Nothing here changes behavior, only text and
dead debug output - low enough risk to skip the round-trip.

## Report-only (needs human judgement, never auto-fixed)

- Plaintext secret (API key, token, password, committed `.env`) - flag
  and say "rotate it", never just delete the line.
- `TODO` / `FIXME` added with no linked issue - the right issue is a
  human call.
- Mutating route with no visible ownership check (heuristic) - the fix is
  a design decision (which check, which error code), not a mechanical
  edit.
- Complexity budget over the limit (below) - report which rule and by how
  much; a mechanical shrink (delete/split) is a design decision on what
  to cut.

## Complexity budget (same intent for JS/TS and Python)

Branches per function <= 10, nesting <= 4, params <= 4, function <= 80
lines (components 120), file <= 300 lines. Over budget: split, do not
disable the rule.

## Testing rules a reviewer checks

- A regression test must fail without the fix and pass with it. Volume of
  tests is not a quality signal on its own.
- Reject a test that only re-asserts the implementation, reads source as
  text instead of running it, or mocks away the real failure mode
  (`test-audit` skill has the full taxonomy).

## Merge-danger line (one-way vs two-way door)

Every review ends with one explicit line: door type + blast radius. See
`pr-review` step 7 for where this is applied.

- **One-way door** (full review, hard to revert): a migration, a risk of
  data loss, a notification or email reaching many users, anything where
  a mistake compounds before anyone notices.
- **Two-way door** (skim): easy to revert, localized blast radius, cheap
  to undo if wrong.
