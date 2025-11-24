# Recovery Strategies

**Purpose:** Define how agents detect when they're stuck and recover without repeating failed approaches.

## Stuck Detection

### Signs You're Stuck
1. **Repeated failures** - Same error after 2+ fix attempts
2. **Circular edits** - Undoing/redoing the same changes
3. **Growing confusion** - Uncertainty about what to try next
4. **Test flapping** - Tests passing then failing on same code
5. **Context overload** - Too many files open, losing track

### Automatic Detection Triggers
- Same error message appears 2+ times
- Edit → revert → edit pattern detected
- More than 5 failed attempts on single task
- Token usage exceeds 50K without progress

---

## Recovery Protocol

### Step 1: Stop and Document
Before trying anything else:
1. **Stop making changes**
2. **Document in WORK_LOG.md:**
   ```markdown
   ## Recovery: [Timestamp]
   **Problem:** [What you're trying to solve]
   **Attempts tried:**
   - [Approach 1]: [Why it failed]
   - [Approach 2]: [Why it failed]
   **Current state:** [What's broken/working]
   ```

### Step 2: Escalate Model
If currently using:
- **Haiku** → Switch to **Sonnet**
- **Sonnet** → Switch to **Opus**
- **Opus** → Proceed to Step 3

### Step 3: Fresh Analysis (Opus)
With Opus, perform structured analysis:

1. **Re-read the original requirement** (PLAN.md, Gherkin spec)
2. **Review WORK_LOG.md** for failed approaches
3. **Explicitly list what NOT to try:**
   ```
   DO NOT REPEAT:
   - [Failed approach 1]
   - [Failed approach 2]
   ```
4. **Generate 3 alternative approaches**
5. **Evaluate each before implementing**

### Step 4: Seek Human Input
If Opus cannot resolve:
1. Document findings in WORK_LOG.md
2. Create a clear question for human review
3. Mark task as BLOCKED in TODO.md
4. Include:
   - What was attempted
   - Why each approach failed
   - Specific question or decision needed

---

## Anti-Pattern Recognition

### Pattern: Retry Loop
```
Error → Same fix → Error → Same fix → Error
```
**Recovery:** Stop. Document. Try fundamentally different approach.

### Pattern: Scope Creep
```
Fix A → Breaks B → Fix B → Breaks C → Fix C → Breaks A
```
**Recovery:** Revert to known good state. Address root cause, not symptoms.

### Pattern: Context Confusion
```
Reading more files → More confused → Reading more files
```
**Recovery:** Close all context. Re-read only PLAN.md. Start minimal.

### Pattern: Assumption Cascade
```
Assume X works → Build on X → X doesn't work → Everything breaks
```
**Recovery:** Identify and verify base assumptions before building.

---

## Checkpoints and Rollback

### Create Checkpoints
After each successful step:
1. Run relevant tests
2. Commit with descriptive message
3. Note checkpoint in WORK_LOG.md

### Rollback Protocol
When recovery requires starting over:
```bash
# Find last good commit
git log --oneline -10

# Reset to checkpoint
git reset --hard <commit-hash>

# Document the rollback
echo "Rolled back to <commit> due to <reason>" >> WORK_LOG.md
```

---

## Recovery Templates

### Template: Debugging Failure
```markdown
## Debug Recovery: [Component/Feature]

**Original Error:**
[Error message]

**Failed Approaches:**
1. [Approach]: [Result]
2. [Approach]: [Result]

**Root Cause Analysis:**
[What I now understand about why these failed]

**New Approach:**
[Fundamentally different strategy]

**Verification Plan:**
[How I'll confirm this works before proceeding]
```

### Template: Blocked Task
```markdown
## BLOCKED: [Task Name]

**Blocking Issue:**
[Clear description]

**Attempted Solutions:**
- [Solution 1]: [Why it didn't work]
- [Solution 2]: [Why it didn't work]

**Information Needed:**
[Specific question for human/team]

**Proposed Options:**
A. [Option with tradeoffs]
B. [Option with tradeoffs]
```

---

## Prevention Strategies

### Before Starting
1. Verify all dependencies are available
2. Confirm understanding of requirements
3. Identify potential blockers upfront

### During Execution
1. Test after each significant change
2. Commit working states frequently
3. Don't stack multiple untested changes

### Early Warning Signs
- "This should work but doesn't" - Stop and verify assumptions
- "Let me try one more thing" (3rd time) - Document and escalate
- "I'm not sure why this is happening" - Gather more information first
