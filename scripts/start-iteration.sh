#!/bin/bash
# ==============================================================================
# Script: start-iteration.sh
# Purpose: Scaffolds a new iteration folder with PLAN, WORK_LOG, and RETRO files.
# Usage:   ./scripts/start-iteration.sh "User Login"
# ==============================================================================

set -euo pipefail

# 1. Input Validation
if [ -z "${1:-}" ]; then
  echo "Error: Missing feature name."
  echo "Usage: ./scripts/start-iteration.sh \"Feature Name\""
  exit 1
fi

# 2. Variables & Pathing
FEATURE_NAME="$1"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
# Clean feature name for folder (alphanumeric + dashes)
SAFE_NAME=$(echo "$FEATURE_NAME" | tr ' ' '-' | tr -cd '[:alnum:]-')
FOLDER_NAME="${TIMESTAMP}_${SAFE_NAME}"
ITERATION_DIR="docs/iterations/${FOLDER_NAME}"

# 3. Create Directory
if [ -d "$ITERATION_DIR" ]; then
  echo "Warning: Directory already exists: $ITERATION_DIR"
  exit 1
fi
mkdir -p "$ITERATION_DIR"

# 4. Generate PLAN.md
cat > "$ITERATION_DIR/PLAN.md" <<EOF
# Plan: $FEATURE_NAME
**Date:** $(date)
**Directory:** $ITERATION_DIR
**Gherkin Spec:** \`docs/specs/${SAFE_NAME}.feature\` (create or update)

## 1. Objective
[One-sentence goal]

## 2. Proposed Changes
### Backend
- [ ]

### Frontend
- [ ]

## 3. Verification Plan
- [ ] **Automated:** All Gherkin scenarios pass
- [ ] **Manual:** [if needed]
EOF

# 5. Generate WORK_LOG.md – headings now exactly match real usage
cat > "$ITERATION_DIR/WORK_LOG.md" <<EOF
# Work Log: $FEATURE_NAME

## Backend Agent
*

## Frontend Agent (N/A in backend-only projects)
*

## Coordination Notes / Shared Contract Changes
*
EOF

# 6. Generate RETRO.md
cat > "$ITERATION_DIR/RETRO.md" <<EOF
# Retrospective: $FEATURE_NAME
**Date:** (fill on completion)

## 1. Quality Checklist
- [ ] All Gherkin scenarios passing
- [ ] TODO.md updated
- [ ] No new lint errors

## 2. Summary
**What went well:**
**Issues encountered:**
**Technical debt added:**

## 3. Proposed Process Improvements
(Orchestrator only – leave blank if none)
EOF

# 7. Update TODO.md → Current Iteration pointer (pure bash, works everywhere)
{
  grep -v '^\*\*Current Iteration:' TODO.md || true
  echo "**Current Iteration:** [$FOLDER_NAME]($ITERATION_DIR)"
} > TODO.tmp && mv TODO.tmp TODO.md

# 8. Success
echo "Iteration initialized!"
echo "   Folder: $ITERATION_DIR"
echo "   Current Iteration pointer updated in TODO.md"