---
name: pr-prune
description: After finishing a PR's implementation, spawn a fresh-context agent whose only job is to find code to cut without changing the requested behavior - counters the agent's own tendency to over-write. Use when the user says "prune this PR", "nettoie le diff avant de l'ouvrir", "on fait la passe de nettoyage", or right after finishing non-trivial implementation work, before opening the PR.
---

# pr-prune

No amount of "stay concise" instruction up front stops an agent from
writing more code than a task needs. What works is a second pass, by an
agent with no memory of writing it, whose only job is to find what to
delete. `pr-review` step 7 already does a delete-oriented read, but from
inside the reviewing agent's own context - this skill's whole value is
the fresh-context constraint, run by the author before anyone else even
looks at it. See `agentic-workflow-reference.md` action item 7b.

## Steps

1. **Scope the diff**: current branch vs its base
   (`git diff main...HEAD`, or the project's actual default branch).
2. **Spawn a fresh subagent** (the `Agent` tool, a non-`fork` type - `fork`
   inherits this conversation's context, which defeats the point. Use
   `general-purpose` or `Explore` and brief it from scratch). Give it only:
   the diff, and the instruction to re-read it "as if the job were to
   delete as much as possible without breaking the requested behavior."
   Ask it to flag:
   - single-use abstractions (a class/interface with exactly one caller)
   - speculative generality ("might need this later")
   - unused exports, dead branches, parameters nothing reads
   - comments or types that only explain complexity the diff itself added
   - logic duplicated from something that already exists elsewhere
3. **It reports, it does not edit.** A list: file:line, what, why it looks
   removable. Read-only subagent (no `Edit`/`Write` tools).
4. **Show the user the list.** Get an OK per item, or as a batch for the
   obvious ones. Drop anything the subagent itself flagged "unsure".
5. **Apply the agreed cuts**, then re-run the project's local gate
   (`make verify` or equivalent). Must stay green with the same behavior.
6. **Report**: lines removed, files touched.

## Guardrails

- Stay inside this diff's blast radius - this is not a general refactor
  pass over pre-existing code, only over what the current task just added.
- Never cut something that changes behavior, only surface area (unused
  abstractions, dead code, speculative generality).
- If the subagent is unsure whether a cut changes behavior, it stays out
  of the batch - ask the user explicitly instead of guessing.

## Why a skill

- The fresh-context requirement is easy to skip by just asking "anything
  to cut?" in the same conversation - that still carries the sunk-cost
  attachment to code just written. A skill makes the subagent spawn the
  default, not an afterthought.
- Pairs with `pr-review`: this runs first, by the author, before opening
  the PR; `pr-review` runs after, for someone else's read (or a solo
  self-review).
