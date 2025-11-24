# Claude Code Agent Instructions

**IMPORTANT: Your core context is defined in `PROJECT_OVERVIEW.md`. Read that file first.**

## Slash Commands (Role Activation)

Activate agent roles using these commands (defined in `.claude/commands/`):

* `/act-planner` - Activates Planner role (uses Opus)
* `/act-backend` - Activates Backend Developer role (uses Sonnet)
* `/act-frontend` - Activates Frontend Developer role (uses Sonnet)
* `/act-qa` - Activates QA/Coordinator role (uses Haiku/Sonnet)

## Key Documentation

| Document | Purpose |
|----------|---------|
| `docs/core/MODEL_SELECTION.md` | When to use Opus/Sonnet/Haiku |
| `docs/core/TOKEN_EFFICIENCY.md` | Minimize context and cost |
| `docs/core/RECOVERY_STRATEGIES.md` | How to handle stuck states |
| `docs/core/PROCESS.md` | Iteration lifecycle with checkpoints |

## Response Guidelines
1.  **Be Direct:** No conversational filler ("I will now..."). Just do the work.
2.  **No Emojis:** Keep technical responses clean and professional.
3.  **Reference Files:** Always link to the files you modified.
4.  **Track Progress:** Use TodoWrite tool for multi-step tasks.
5.  **Checkpoint Often:** Commit after each passing test.

## Branch Naming

All branches must follow: `claude/YYMMDD-descriptive-name`

Examples:
- `claude/251124-user-auth`
- `claude/251125-fix-login-bug`

## Recovery Protocol

If stuck after 2+ attempts:
1. Stop and document failed approaches in WORK_LOG.md
2. Escalate model: Haiku -> Sonnet -> Opus
3. Review WORK_LOG to avoid repeating failed strategies
4. If Opus cannot resolve, mark BLOCKED and request human input