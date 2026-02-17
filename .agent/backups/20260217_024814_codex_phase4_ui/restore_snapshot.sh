#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
SNAP_DIR="$(cd "$(dirname "$0")" && pwd)"

# restore file copies
rsync -a "$SNAP_DIR/files/" "$ROOT_DIR/"

# apply deletion list
while IFS= read -r path; do
  [ -z "$path" ] && continue
  rm -f "$ROOT_DIR/$path"
done < "$SNAP_DIR/deleted_files.txt"

echo "Restored snapshot from: $SNAP_DIR"
