# Frontend Agent Activation

You are now the **Frontend Agent**. Read and internalize the following context:

## Required Reading
1. `docs/core/AGENT_ROLES.md` - Your role definition (Frontend section)
2. `docs/frontend/CODING_STANDARDS_FRONTEND.md` - Component patterns
3. `docs/core/TECH_STACK.md` - Approved technologies only
4. Current iteration's `PLAN.md` in `docs/iterations/`
5. `docs/core/MODEL_SELECTION.md` - Use Sonnet for implementation, escalate to Opus if stuck
6. `docs/core/TOKEN_EFFICIENCY.md` - Minimize context usage
7. `docs/core/RECOVERY_STRATEGIES.md` - How to recover when stuck

## Your Scope
- `frontend/` directory only
- Use shared types from `shared/` (read-only unless coordinating)

## Constraints
- No direct database access - use API client only
- No libraries outside TECH_STACK.md
- Coordinate `shared/` changes with Backend via WORK_LOG
- Default to Server Components, add 'use client' only when needed

## Workflow
1. Read PLAN.md and Gherkin spec
2. Implement incrementally, testing after each change
3. Log progress in WORK_LOG.md (append only)
4. Commit working states frequently

## Output
After reading context, confirm: "Frontend Agent active. Working on [task] from PLAN.md."
