# Model Selection Guide

**Purpose:** Optimize cost and quality by using the right model for each task type.

## Model Tiers

| Model | Strengths | Cost | Use When |
|-------|-----------|------|----------|
| **Opus** | Deep reasoning, complex architecture, recovery from stuck states | $$$ | Planning, debugging complex issues, architectural decisions |
| **Sonnet** | Balanced speed/quality, good code generation | $$ | Standard implementation, code review, refactoring |
| **Haiku** | Fast, cheap, sufficient for simple tasks | $ | Searches, simple edits, file operations, test execution |

---

## Task-to-Model Mapping

### Planning Phase (Planner Agent)
| Task | Model | Rationale |
|------|-------|-----------|
| Feature breakdown & PLAN.md creation | **Opus** | Requires understanding full context and dependencies |
| Gherkin spec authoring | **Sonnet** | Structured format, moderate complexity |
| TODO.md updates | **Haiku** | Simple file modifications |

### Execution Phase (Frontend/Backend Agents)
| Task | Model | Rationale |
|------|-------|-----------|
| New component/handler implementation | **Sonnet** | Standard code generation |
| Complex algorithm or data modeling | **Opus** | Requires deep reasoning |
| Simple edits, imports, renames | **Haiku** | Mechanical changes |
| Codebase exploration/search | **Haiku** | Use Explore sub-agents |
| Debugging failing tests | **Sonnet** -> **Opus** | Escalate if stuck |

### Verification Phase (QA Agent)
| Task | Model | Rationale |
|------|-------|-----------|
| Running test suites | **Haiku** | Mechanical execution |
| Analyzing test failures | **Sonnet** | Pattern recognition |
| Writing RETRO.md | **Sonnet** | Synthesis and reflection |

---

## Model Escalation Protocol

When an agent is stuck (see `RECOVERY_STRATEGIES.md`), escalate models:

```
Haiku (stuck) -> Sonnet (stuck) -> Opus
```

### Escalation Triggers
1. **Same error 2+ times** after attempted fix
2. **Circular reasoning** - trying same approach repeatedly
3. **Context confusion** - misunderstanding requirements
4. **Complex debugging** - multi-file interaction bugs

### Escalation Process
1. Document what was tried in WORK_LOG.md
2. Switch to higher-tier model
3. Provide summary of failed approaches
4. Request fresh analysis with explicit "do not repeat" list

---

## Cost Optimization Rules

1. **Start low, escalate up** - Begin with Haiku for exploration, Sonnet for implementation
2. **Parallel sub-agents** - Spawn Haiku agents for independent searches
3. **Targeted context** - Only load files relevant to current task
4. **Early exit** - If Haiku can complete the task, don't use Sonnet
5. **Batch simple operations** - Group Haiku tasks together

---

## Branch Naming Convention

All branches must follow the format:
```
claude/YYMMDD-descriptive-name
```

Examples:
- `claude/251124-user-auth-feature`
- `claude/251125-fix-login-bug`
- `claude/251126-refactor-api-client`
