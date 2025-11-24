# Token Efficiency Guidelines

**Purpose:** Minimize token usage to reduce cost and improve response quality through focused context.

## Core Principles

1. **Load only what you need** - Never dump entire files when a section suffices
2. **Use sub-agents for exploration** - Spawn Haiku agents for searches
3. **Targeted reads** - Specify line ranges for large files
4. **Parallel over sequential** - Run independent tasks concurrently

---

## File Reading Strategies

### Small Files (<200 lines)
Read the entire file. No special handling needed.

### Medium Files (200-500 lines)
Read fully on first access, then use targeted reads for edits.

### Large Files (>500 lines)
1. First: Read with `limit: 100` to understand structure
2. Then: Use `offset` + `limit` to read specific sections
3. Never load the entire file into context

### Example Patterns
```
# Bad: Loading 2000-line file
Read file.ts

# Good: Targeted read
Read file.ts lines 150-250 (the function I need to edit)
```

---

## Search Strategies

### For Specific Queries (needle-in-haystack)
Use direct tools:
- `Glob` for file patterns
- `Grep` for content patterns
- `Read` for known file paths

### For Open-Ended Exploration
**Always spawn an Explore sub-agent:**
```
Task(subagent_type="Explore", prompt="Find where user authentication is handled")
```

Benefits:
- Explore agent uses Haiku (cheaper)
- Returns summarized findings (smaller context)
- Parallel exploration possible

### Anti-Patterns
- Grepping entire codebase without filters
- Reading multiple files "just in case"
- Loading test files when only editing source

---

## Sub-Agent Spawning

### When to Spawn Sub-Agents
1. **Independent searches** - Can run in parallel
2. **Large codebase exploration** - Offload to Explore agent
3. **Parallel implementation** - Frontend/Backend simultaneously

### Sub-Agent Guidelines
- Provide specific, scoped prompts
- Request only the information you need returned
- Don't ask sub-agents to do work you'll redo

### Example
```
# Good: Specific request
Task("Find all API route handlers and return their file paths and HTTP methods")

# Bad: Vague request
Task("Tell me about the API")
```

---

## Context Management

### Before Starting Work
1. Identify the minimum files needed
2. Read PLAN.md and relevant Gherkin spec
3. Read only the specific source files to modify

### During Implementation
1. Use TodoWrite to track progress (prevents re-reading for context)
2. Commit frequently (creates checkpoints)
3. Don't re-read files you just modified

### What NOT to Load
- Test files (unless debugging tests)
- Documentation (unless specifically needed)
- Configuration files (unless modifying config)
- Node modules or generated files

---

## Parallel Operations

### Maximize Parallelism
When multiple operations are independent, execute them in a single message:
```
# Good: Parallel reads
Read(file1.ts) + Read(file2.ts) + Read(file3.ts)

# Bad: Sequential reads
Read(file1.ts)
... wait ...
Read(file2.ts)
... wait ...
Read(file3.ts)
```

### Parallel Sub-Agents
```
# Launch multiple Explore agents simultaneously
Task("Find auth handlers") + Task("Find database models") + Task("Find API routes")
```

---

## Token Budget Guidelines (Soft Limits)

These are **guidelines, not hard limits**. Complex tasks naturally require more context. The goal is efficiency, not artificial constraints.

| Operation | Target | Acceptable Range | Notes |
|-----------|--------|------------------|-------|
| Single file edit | ~10K | 5-20K | Simple edits need less |
| Feature implementation | ~50K | 30-80K | Complex features may need more |
| Codebase exploration | Use sub-agents | - | Offload to Haiku agents |
| Full iteration | ~100K | 80-150K | Multi-file features need headroom |
| Debugging complex issues | ~80K | 50-120K | May need extensive context |

### When to Exceed Guidelines
It's acceptable to use more context when:
- Debugging requires reading multiple related files
- Feature spans many interconnected components
- Understanding legacy code with poor documentation
- Complex refactoring with many dependencies

### When Approaching High Usage
1. **Don't panic** - finish the current logical unit of work
2. Commit current progress (creates a checkpoint)
3. Summarize state in WORK_LOG.md
4. Consider: Can remaining work be done in a fresh context?

### Context Reset Strategy
If context is getting unwieldy:
```markdown
## Context Handoff Summary
**Completed:** [What's done]
**Current State:** [What's working/broken]
**Next Steps:** [Specific remaining tasks]
**Key Files:** [Files needed for next phase]
```
This summary enables a fresh context to continue efficiently.
