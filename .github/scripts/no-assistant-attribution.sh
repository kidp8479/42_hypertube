#!/bin/sh
# Reads a text on stdin (a commit message or a PR description) and fails if it
# carries assistant attribution: a `Co-Authored-By:` with an assistant, a
# `Claude-Session:` style trailer, a "Generated with <assistant>" footer, a
# robot-emoji line or a claude.ai/code session link. Same patterns as the
# local `.githooks/commit-msg` hook, which trims them; this is the check that
# cannot be skipped, since a hook only runs where `core.hooksPath` is set.
#
# Usage: <text> | .github/scripts/no-assistant-attribution.sh "<what is checked>"
# Human co-authors are fine; the file name CLAUDE.md and the .claude/
# directory are not attribution and do not match.

what="${1:-input}"

found=$(grep -niE \
	-e '^[[:space:]]*co-authored-by:.*(claude|anthropic|cursor|copilot|codex)' \
	-e '^[[:space:]]*co-authored-by:.*@anthropic\.com' \
	-e '^[[:space:]]*(claude|assistant|ai)-session:' \
	-e '(generated|co-authored) with .*(claude|cursor|copilot|codex)' \
	-e '^[[:space:]]*🤖' \
	-e 'https?://claude\.ai/code/' || true)

if [ -n "$found" ]; then
	echo "Assistant attribution found in $what:" >&2
	echo "$found" | sed 's/^/  /' >&2
	exit 1
fi
