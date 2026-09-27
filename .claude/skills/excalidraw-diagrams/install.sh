#!/usr/bin/env bash
# Install this skill into a repo (default: current dir) or globally.
#   ./install.sh [target-repo]   -> <target-repo>/.claude/skills/excalidraw-diagrams
#   ./install.sh --global        -> ~/.claude/skills/excalidraw-diagrams
set -euo pipefail
src="$(cd "$(dirname "$0")" && pwd)"
if [ "${1:-}" = "--global" ]; then dest="$HOME/.claude/skills/excalidraw-diagrams"
else dest="$(cd "${1:-.}" && pwd)/.claude/skills/excalidraw-diagrams"; fi
[ "$src" = "$dest" ] && { echo "already in place"; exit 0; }
mkdir -p "$dest"
tar -C "$src" --exclude=node_modules --exclude=__pycache__ -cf - . | tar -C "$dest" -xf -
echo "installed to $dest"
echo "next: cd $dest/scripts && npm install"
