#!/bin/sh
# PostToolUse hook (matcher "Write|Edit"): EXPERIMENTAL.
#
# Goal: close the slop-control loop IN SESSION. The ESLint ratchet
# (docs/adr/0005-lint-complexity-budget.md) runs at commit / CI time;
# this runs the same linter on the single file the agent just wrote, so
# it fixes the warning now instead of at commit.
#
# PostToolUse runs AFTER the write, so this flags, it does not block.
#   exit 0 -> nothing
#   exit 2 -> stderr sent back to the model (it can fix straight away)
#
# Deliberately conservative: no-ops unless the project actually has a
# local eslint. Meant to be promoted to Hypertube, where it does.

set -eu

input=$(cat)
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')

case "$path" in
	*.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) : ;;
	*) exit 0 ;;
esac
[ -f "$path" ] || exit 0

# walk up from the file to the nearest package.json with a local eslint
dir=$(CDPATH= cd -- "$(dirname -- "$path")" && pwd)
pkg_dir=""
while [ "$dir" != "/" ]; do
	if [ -f "$dir/package.json" ] && [ -x "$dir/node_modules/.bin/eslint" ]; then
		pkg_dir="$dir"
		break
	fi
	dir=$(dirname "$dir")
done
[ -n "$pkg_dir" ] || exit 0

# lint just this file (keep warnings: errors-only would hide the warn-level
# slop rules), cap runtime. JSON output + jq: the "unix" formatter was
# dropped from core ESLint 9, and jq is already a dependency of this hook.
out=$(cd "$pkg_dir" && timeout 30 ./node_modules/.bin/eslint --no-error-on-unmatched-pattern --format json "$path" 2>/dev/null || true)

findings=$(printf '%s' "$out" | jq -r '
	.[]?.messages[]?
	| "  \(.line):\(.column)  \(if .severity == 2 then "error" else "warning" end)  \(.message)  \(.ruleId // "")"
' 2>/dev/null || true)
[ -n "$findings" ] || exit 0

echo "lint-feedback.sh: eslint findings on the file you just wrote:" >&2
printf '%s\n' "$findings" >&2
echo "Fix these now (see .claude/skills/anti-slop). Do not disable the rule." >&2
exit 2
