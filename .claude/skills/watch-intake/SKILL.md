---
name: watch-intake
description: Process a new batch of technical-watch material (pasted bookmarks, a reading-list report) into the lab's watch archive, then propose a diff to the workflow reference for the user to validate - never applies the diff on its own. Use when the user pastes a bookmarks export or watch report, or says "traite ma veille", "process my bookmarks", "nouveau lot de veille".
---

# watch-intake

Turns a raw batch of technical-watch material into an update proposal for
`docs/agentic-workflow-reference.md`, without ever editing that file
unattended. The reference is the thing that actually gets applied to real
repos, so a bad or duplicate entry there costs more than one caught late
in `docs/watch/`.

Pipeline this is step 1 of: **watch -> agentic-lab -> test on a small repo
-> promote to the templates if conclusive**. This skill only covers the
first arrow.

## Steps

1. **Locate the batch.** The user pastes it, or names a file already on
   disk. If it is a raw list of bookmark URLs with no summary, say so and
   ask whether to fetch each one or work from what is pasted - do not
   silently invent summaries for links you have not read.

2. **Dedup against history.** List `docs/watch/*.md`. For each item in the
   new batch, check whether the same post (by URL) already appears in an
   earlier batch file or is already reflected in
   `docs/agentic-workflow-reference.md`. Drop exact repeats; keep an item
   that adds a new angle on something already covered, but say so.

3. **Archive the batch.** Write it to `docs/watch/YYYY-MM-DD-raw.md`
   (today's date; if a file for today exists, append instead of
   overwriting). Keep the source's own wording for claims - this is the
   archive, not the synthesis.

4. **Classify against the reference.** Read
   `docs/agentic-workflow-reference.md`. For each surviving item, decide:
   - **confirms** an existing point (no change needed, note it anyway so
     the reference gains a second source next time it is cited);
   - **adds** a point not currently covered;
   - **contradicts** something currently written;
   - **out of scope** (project-specific, not generic, or not about
     agentic workflow / code-under-agent at all - drop it, do not force
     a place for it).

5. **Propose a diff.** For every "adds" or "contradicts" item, draft the
   exact edit to `docs/agentic-workflow-reference.md` (which section, what
   text) and show it as a diff or clearly-marked proposed change. Do not
   apply it yet.

6. **Stop for validation.** End with the list of proposed changes and
   ask which to apply. Only write them into
   `docs/agentic-workflow-reference.md` after the user says which ones,
   then update section 6 (the dated snapshot) if the changes affect it.

## Guardrails

- Never invent a detail (an exact prompt, a lint threshold, a command
  name) that was not in the source. If a summary is vague, flag it as
  unverified rather than filling the gap.
- Never edit `agentic-workflow-reference.md` without an explicit go-ahead
  on the specific diff - step 3 (the archive) is the only unattended
  write.
- This skill does not touch any other repo. Testing a reference change on
  a real project is a separate step (see the reference's own section 5
  starter prompt), not part of this skill.
