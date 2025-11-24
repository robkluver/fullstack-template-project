#!/bin/bash
# ==============================================================================
# Script: finish-iteration.sh
# Purpose: Marks the current iteration as done, links its RETRO in TODO.md,
#          and clears the "Current Iteration" pointer.
# Usage:   ./scripts/finish-iteration.sh
# ==============================================================================

set -euo pipefail

# Find the latest iteration folder (most recent timestamp)
LATEST=$(ls -1 docs/iterations/ | sort -r | head -n1)
ITERATION_DIR="docs/iterations/$LATEST"

if [ -z "$LATEST" ] || [ ! -d "$ITERATION_DIR" ]; then
  echo "No iteration folder found."
  exit 1
fi

# Extract human-readable feature name from folder (after timestamp_)
FEATURE=$(echo "$LATEST" | cut -d'_' -f3- | tr '-' ' ')

# Append completed entry to TODO.md
echo "- [x] **$FEATURE** → [RETRO]($ITERATION_DIR/RETRO.md)" >> TODO.md

# Clear the "Current Iteration" line
sed -i '' '/**Current Iteration:/d' TODO.md
echo "**Current Iteration:** [None – ready for next]" >> TODO.md

echo "Iteration \"$FEATURE\" marked complete!"
echo "   RETRO linked in TODO.md"
echo "   Current Iteration pointer cleared"
