---
name: retro
description: Mine recent agent sessions or a team's PR review comments for systemic fixes - stale docs, repeated review comments, token-wasting dead ends - and turn them into concrete doc or guardrail updates. Use when the user says "fais un retro", "/retro", "qu'est-ce qu'on peut ameliorer dans le repo", or periodically (roughly every 10 sessions, or after a batch of PR reviews).
disable-model-invocation: true
---

# retro

Named after Matt Pocock's `/retro` skill (compared against the real
v1.3.1 implementation on 2026-10-10 - see "Compared to the original"
below for what differs on purpose). Formalizes the loop already cited in
`agentic-workflow-reference.md` 2.2 ("every review comment becomes a new
check so the same mistake is never flagged twice") with a concrete
trigger and procedure, instead of relying on remembering to do it by
hand. `disable-model-invocation` so it only runs when asked, never on a
casual phrase that happens to match.

Two independent modes - run the one the user asks for, or both.

## Mode A: session mining

Looks back over recent work sessions on **this repo** for friction that
repeats. Look for candidates in these categories (classify each one - do
not just note "could be better"):

- **Navigation**: did the agent take a long time to find a piece of
  information? Would a pointer in `CLAUDE.md`/`AGENTS.md` or a doc have
  made it one lookup instead of several?
- **Automated checks**: did the agent make a mistake a lint/typecheck/
  test could have caught? Read the repo's own check command first (its
  `Makefile`/CI workflow) - a check that exists but sits unwired or
  silently broken is the finding, not a reinvention. A repo with no
  guardrail at all (no pre-commit hook, no CI running format/lint/test)
  is itself a finding.
- **Coding standards**: did the reviewer agent miss something it should
  enforce? **Classify first**: a mechanical violation (fixed syntactic
  pattern, banned API, import shape, file-location rule) gets a
  deterministic check - a linter rule, a pre-commit hook, a CI job -
  never a line in `engineering.md`. Reserve the doc for genuine judgment
  calls (cross-file consistency, "matches the surrounding style") that no
  guardrail could substitute for.
- **Steering files**: is `CLAUDE.md`/`AGENTS.md` large enough that
  instructions belong in `engineering.md` or a doc instead? Any
  **no-ops** - instructions the agent already follows by default, paying
  context on every turn for nothing?
- **Tool economy**: any expensive or token-inefficient tool call that
  repeated, or custom tooling (CLI, MCP) that could be streamlined?
- **Information access**: was a piece of information unavailable that
  the agent needed - dev server logs, read-only access to a third-party
  service?

1. Ask the user the window if not given (default: since the last `retro`
   run, or roughly the last 10 sessions). Sources, since conversation
   history is not retained across sessions by default on this multi-
   machine setup: `git log`, `notes/journal.md` (`log-session`'s
   output), the project's Slack daily-log and Session Handoff doc
   (`end-session`/`resume-session`), commit messages that mention a
   correction or a dead end. (The original skill reads on-machine session
   logs directly - not available here across home/school machines, hence
   this proxy trail; use it if a real transcript is actually reachable.)
2. For each session's trace, classify any friction into the categories
   above.
3. Turn each repeated friction point into a **specific** fix at the right
   altitude (deterministic check for mechanical issues, doc update only
   for judgment calls) - not "improve the docs". If a fix only happened
   once, it is not yet a pattern; do not propose a change from a single
   occurrence.
4. Show the list with the evidence (which session, what happened),
   ordered by severity. Get an OK per item, then apply.

When a finding is "steering files are a mess", hand off to
`mattpocock-skills:writing-for-agents` (no-ops, progressive disclosure,
moving instructions to `engineering.md`) rather than redoing that
analysis here.

## Mode B: PR-comment mining

Looks across a team's recent PR review comments for a theme that comes
up more than once, and proposes it as a standing rule instead of a
recurring comment.

1. Ask the user how many PRs / what window. Pull comments:
   `gh api repos/{owner}/{repo}/pulls/comments --paginate` (or
   `gh pr view <n> --comments` per PR for a short list).
2. Cluster by underlying issue, not by wording - two comments phrased
   differently about the same mistake are one theme.
3. For each theme raised **more than once**, draft the exact addition to
   `standards/engineering.md` (or the project's `CODING_STANDARDS.md` if
   it has a separate one) that would have caught it before review. Keep
   the 150-line target in mind (`agentic-workflow-reference.md` action
   item 4) - split into a new file instead of padding one past it.
4. Show the list with the source comments. Get an OK per item, then
   apply.

## Guardrails

- One occurrence is an incident, not a pattern - mode B needs 2+
  independent comments on the same theme, mode A needs the same friction
  across more than one session, before proposing a fix.
- Propose the fix at the altitude it belongs: a wrong fact goes in the
  doc that was wrong, a process gap goes in `engineering.md`, a
  project-specific pitfall goes in that project's own `CLAUDE.md` -
  not everything belongs in the same file.
- Never edit unattended: this skill always ends with a list the user
  approves before anything is written, same contract as `watch-intake`.

## Compared to the original

Verified against `mattpocock-skills@mattpocock` v1.3.1
(`skills/engineering/retro/SKILL.md`) on 2026-10-10. Kept: the category
list above, the mechanical-vs-judgment-call split, reading the repo's own
check command before calling something unguarded, `disable-model-
invocation`. Diverges on purpose: the original reads session logs on the
machine it runs on; this one reads git/Slack/Session-Handoff instead,
because work here crosses home and school machines that share no local
session history. Added on purpose: Mode B (PR-comment mining across a
team) - not in the original, which is single-session-focused only.

## Why a skill

- The loop it formalizes is already the stated goal in
  `agentic-workflow-reference.md` - without a trigger it only happens
  when someone remembers to ask for it.
- Fixed source list per mode so the output is reproducible instead of
  "whatever the agent happens to recall".
