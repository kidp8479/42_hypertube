#!/bin/sh
# Dev container start (twin of backend/dev-start.sh, each build context needs
# its own copy). node_modules is a named volume: filled from the image once,
# then it masks every later image, so a pulled lockfile change would keep
# running the old dependencies (HYP-86). The lockfile hash of the last install
# is stamped in the volume; a different hash reinstalls before starting.
set -eu

STAMP=node_modules/.lockfile-sha256
current=$(sha256sum package-lock.json | cut -d' ' -f1)

if [ "$current" != "$(cat "$STAMP" 2>/dev/null)" ]; then
  echo "dev-start: package-lock.json changed since the last install, running npm ci"
  npm ci
  echo "$current" > "$STAMP"
fi

exec "$@"
