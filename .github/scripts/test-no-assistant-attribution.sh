#!/bin/sh
# Self-test for no-assistant-attribution.sh: what it must reject and what it
# must let through. Run by the "No assistant attribution" workflow.
check="$(dirname "$0")/no-assistant-attribution.sh"
failures=0

expect() { # expect <exit code> <description> <text>
	want="$1"
	desc="$2"
	printf '%s\n' "$3" | "$check" "$desc" >/dev/null 2>&1
	got=$?
	if [ "$got" = "$want" ]; then
		echo "ok   $desc"
	else
		echo "FAIL $desc (exit $got, wanted $want)"
		failures=$((failures + 1))
	fi
}

expect 1 "Claude co-author trailer" "feat: x

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
expect 1 "Anthropic address as co-author" "feat: x

Co-authored-by: Someone <noreply@anthropic.com>"
expect 1 "session trailer" "feat: x

Claude-Session: https://claude.ai/code/session_01YHP"
expect 1 "generated-with footer" "body

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
expect 1 "claude.ai session link" "see https://claude.ai/code/session_x"
expect 0 "human co-author is kept" "feat: x

Co-authored-by: Ada Lovelace <ada@example.com>"
expect 0 "CLAUDE.md in a title" "docs: translate CLAUDE.md to English"
expect 0 ".claude/ path in a body" "moves .claude/standards/engineering.md and the claude hooks"
expect 0 "dependabot release note naming a contributor" "Bump x. Contributors: ShreeBohara, Claude Opus 5"

[ "$failures" = 0 ] || exit 1
