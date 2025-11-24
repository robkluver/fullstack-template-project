#!/bin/bash

# ==============================================================================
# Script: start-iteration.sh
# Purpose: Scaffolds a new iteration folder with PLAN, WORK_LOG, and RETRO files.
# Usage:   ./scripts/start-iteration.sh "User Login"
# ==============================================================================

# 1. Input Validation
if [ -z "$1" ]; then
  echo "❌ Error: Missing feature name."
  echo "Usage: ./scripts/start-iteration.sh \"Feature Name\""
  exit 1
fi

# 2. Variables & Pathing
FEATURE_NAME=$1
TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
# Clean feature name for folder/filenames (spaces to underscores, alphanumeric only)
SAFE_NAME=$(echo "$FEATURE_NAME" | tr ' ' '-' | tr -cd '[:alnum:]-')
FOLDER_NAME="${TIMESTAMP}_${SAFE_NAME}"
ITERATION_DIR="docs/iterations/${FOLDER_NAME}"

# 3. Create Directory
if [ -d "$ITERATION_DIR" ]; then
  echo "⚠️  Directory already exists: $ITERATION_DIR"
  exit 1
fi

mkdir -p "$ITERATION_DIR"

# 4. Generate PLAN.md
cat > "$ITERATION_DIR/PLAN.md" <<EOL
# Plan: $FEATURE_NAME
**Date:** $(date)
**Directory:** $ITERATION_DIR
**Gherkin Spec:** \`docs/specs/${SAFE_NAME}.feature\` (To be created/updated)

## 1. Objective
[Brief one-sentence goal of this iteration]

## 2. Proposed Changes
### Backend
- [ ] ...

### Frontend
- [ ] ...

## 3. Verification Plan
- [ ] **Automated:** Gherkin scenarios passed.
- [ ] **Manual:** [Specific manual check if needed]
EOL

# 5. Generate WORK_LOG.md
cat > "$ITERATION_DIR/WORK_LOG.md" <<EOL
# Work Log: $FEATURE_NAME
**Context:** Parallel execution log to prevent circular logic.

## ⚙️ Backend Agent Log
* **[COMPLETED]** ...
* **[DECISION]** ...
* **[BLOCKER]** ...

## 🎨 Frontend Agent Log
* **[COMPLETED]** ...
* **[DECISION]** ...
* **[BLOCKER]** ...

## 🤝 Coordination Notes
* ...
EOL

# 6. Generate RETRO.md
cat > "$ITERATION_DIR/RETRO.md" <<EOL
# Retrospective: $FEATURE_NAME
**Date:** (To be filled upon completion)

## 1. Quality Checklist
- [ ] All Gherkin scenarios passing?
- [ ] \`TODO.md\` updated?
- [ ] No new linting errors?

## 2. Summary
* **What went well:** ...
* **Issues encountered:** ...
* **Technical debt added:** ...
EOL

# 7. Success Output
echo "✅ Iteration initialized!"
echo "   📂 Folder: $ITERATION_DIR"
echo "   📄 $ITERATION_DIR/PLAN.md"
echo "   📄 $ITERATION_DIR/WORK_LOG.md"
echo "   📄 $ITERATION_DIR/RETRO.md"
