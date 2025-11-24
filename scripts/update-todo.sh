#!/bin/bash
# Rebuilds TODO.md dashboard from completed iteration folders + active pointer
set -euo pipefail

cat > TODO.md <<'EOF'
# Project Roadmap & Status

**Current Iteration:** $(ls -1 docs/iterations/ 2>/dev/null | sort -r | head -n1 | xargs -I{} echo "[{}](docs/iterations/{})" || echo "[None]")

## Completed
EOF

# Add all finished iterations (those with RETRO.md)
for retro in $(find docs/iterations -name RETRO.md | sort -r); do
  dir=$(dirname "$retro")
  name=$(basename "$dir" | cut -d'_' -f3- | tr '-' ' ')
  echo "- [x] **$name** → [RETRO]($dir/RETRO.md)" >> TODO.md
done

echo "" >> TODO.md
echo "## Backlog" >> TODO.md
echo "- [ ] Feature: Password Reset" >> TODO.md
# …add any permanent backlog items here or source from another file
