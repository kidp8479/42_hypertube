# Lint complexity budget as an anti-slop net

**Date:** 2026-09-02 · **Status:** accepted

Add draconian complexity and size limits to ESLint (`backend/eslint.config.mjs`,
`frontend/eslint.config.js`), all at `warn`, held at zero by a monotone
`--max-warnings 0` ceiling in each package's `lint:check` script.

```
complexity                    10     branches per function
max-depth                      4     nested blocks
max-nested-callbacks           3     callback pyramids
max-params                     4     past that, pass an object
max-lines-per-function        80     (120 for **/*.tsx components)
max-lines                    300     per file
sonarjs/cognitive-complexity  15     reading-effort metric, better signal than cyclomatic
sonarjs/no-identical-functions       copy-paste
sonarjs/no-duplicate-string    4     same literal 4+ times -> named constant
@typescript-eslint/no-explicit-any   off -> warn (backend)
```

Spec files override `max-lines`, `max-lines-per-function`,
`max-nested-callbacks` and `sonarjs/no-duplicate-string` to off: a
`describe > it > mock` nest and repeated fixture strings are idiomatic
test structure, not slop.

## Why

- **These limits are a poor fit for a human author but a good automatic net
  against agent over-code.** The failure mode of an AI coding assistant on
  this repo is over-production: speculative abstractions, giant functions,
  deep nesting, copy-paste, `any` to silence a type it should have modelled.
  A complexity budget catches all of that without a human reading the diff.
- **Zero marginal cost.** Merges already block on `lint:check` (pre-commit
  hook and CI). Adding rules to the same gate costs no new process.
- **`warn`, not `error`, plus a zero ceiling.** New rules land as warnings so
  they never break an unrelated branch mid-flight, but `--max-warnings 0` in
  the `lint:check` *script* (not only the CI step: the pre-commit hook runs
  the same script) makes the gate just as hard. The count is monotone: it
  can only be lowered. A rule graduates to `error` once the codebase has sat
  at zero for it across a few PRs.
- **The baseline was already 0/0.** The auth foundation (HYP-10) passes every
  rule as written, so the ratchet starts fully locked rather than carrying
  debt.

## How it fits the three-layer anti-slop setup

1. **teach** - the `anti-slop` skill (`.claude/skills/anti-slop/`): the same
   budget as a checklist held in context while writing, so code clears the
   gate on the first run.
2. **check** - the `lint-feedback.sh` PostToolUse hook (`.claude/hooks/`):
   runs ESLint on each file just written and feeds warnings back in-session.
3. **gate** - this ADR: the ratchet at commit / CI time.

## Consequences

- A change that pushes a function or file over budget fails the pre-commit
  hook and CI. The fix is to split it, never to disable the rule inline.
- New ESLint dependency in both packages: `eslint-plugin-sonarjs` (dev).
  Registered as a plugin only - `sonarjs.configs.recommended` (~50 rules) is
  deliberately not extended.
- If a limit proves genuinely wrong for this codebase, it is loosened here
  with a note, not bypassed per-file.
- Once this has lived on a few PRs without friction, the rule block is
  promoted to `42-project-template` (HYP-26) so later projects inherit it.
- Follow-up, out of scope here: the frontend CI has no `npm run test` step.
