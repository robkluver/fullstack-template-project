# Agent Roles & Responsibilities

**Context Source:** All agents must read `PROJECT_OVERVIEW.md` first.

**Related Docs:**
- `MODEL_SELECTION.md` - Which model to use for each task type
- `TOKEN_EFFICIENCY.md` - Minimize context usage and cost
- `RECOVERY_STRATEGIES.md` - How to handle stuck states

## 1. Planner Agent
* **Model:** Opus (complex reasoning required)
* **Trigger:** New feature request or `TODO.md` item.
* **Responsibilities:**
    * Analyze requirements and break them into atomic tasks.
    * **Create Branch:** `claude/YYMMDD-feature-name`
    * **Create the Iteration Folder:** Run `./scripts/start-iteration.sh "Feature Name"`
    * **Schema Design (If Needed):** If the feature requires new DynamoDB entities or schema changes, invoke `/act-dynamodb-architect` before creating PLAN.md. Wait for approved schema.
    * **Author `PLAN.md`:** Define the objective, affected files, and step-by-step instructions. Include approved schema design if applicable.
    * **Author/Update Gherkin:** Create or update `docs/specs/*.feature` to define success.
* **Handoff:** to *Frontend* and *Backend* agents simultaneously.
* **Activation:** `/act-planner`

## 2. Frontend Developer
Note: In backend-only projects this role is inactive. Leave all frontend tasks as "N/A".
* **Model:** Sonnet (escalate to Opus if stuck per `RECOVERY_STRATEGIES.md`)
* **Trigger:** `PLAN.md` is created.
* **Scope:** `apps/web/` directory ONLY.
* **Standards:** `docs/frontend/CODING_STANDARDS_FRONTEND.md`
* **Responsibilities:**
    * Implement UI components per `docs/frontend/DESIGN_SYSTEM.md`.
    * Manage state using **Zustand** and **TanStack Query**.
    * **Strictly** follow the Gherkin feature file.
    * **Log Work:** specific entries in `docs/iterations/.../WORK_LOG.md`.
    * **Checkpoint:** Test and commit after each significant change.
* **Constraints:**
    * No direct DB access. Must use API Client.
    * Never edit the same file in packages/shared/src/ in the same iteration. If both roles need changes to the same file, Backend proposes
      the diff in WORK_LOG → Frontend merges and commits.
* **Activation:** `/act-frontend`

## 3. Backend Developer
* **Model:** Sonnet (escalate to Opus if stuck per `RECOVERY_STRATEGIES.md`)
* **Trigger:** `PLAN.md` is created.
* **Scope:** `apps/api/` (Lambda/Serverless) and `packages/shared/` (Types).
* **Standards:** `docs/backend/CODING_STANDARDS_BACKEND.md`
* **Responsibilities:**
    * Implement Lambda handlers (Node.js 20).
    * Define DynamoDB access patterns (Single Table Design).
    * Update `packages/shared/src/types/` to ensure contract safety.
    * **Log Work:** specific entries in `docs/iterations/.../WORK_LOG.md`.
    * **Checkpoint:** Test and commit after each significant change.
    * **DynamoDB Validation:** When modifying database code, validate against `docs/backend/DYNAMODB_CONVENTIONS.md` before marking task complete.
* **Constraints:**
    * No UI code.
    * Never edit the same file in packages/shared/src/ in the same iteration. If both roles need changes to the same file, Backend proposes
      the diff in WORK_LOG → Frontend merges and commits.
* **Activation:** `/act-backend`

## 4. QA / Coordinator
* **Model:** Haiku for test execution, Sonnet for analysis
* **Trigger:** Frontend and Backend agents report completion.
* **Responsibilities:**
    * Run the full test suite (Unit + E2E).
    * Verify implementation matches `docs/specs/*.feature`.
    * **DynamoDB Compliance Check:** If iteration includes database changes, verify compliance with `docs/backend/DYNAMODB_CONVENTIONS.md`.
    * **Author `RETRO.md`:** Summary of the iteration.
    * **Update `TODO.md`:** Mark tasks as complete.
    * Run `./scripts/finish-iteration.sh` to close the iteration.
* **Activation:** `/act-qa`

## 5. Tech Lead Agent
* **Model:** Opus (deep reasoning + web search for up-to-date information)
* **Trigger:** On-demand when developers need guidance or periodic review.
* **Scope:** Tech stack governance, code quality oversight, developer support, documentation organization.
* **Authority:** Only agent permitted to modify `TECH_STACK.md`.
* **Decision Log:** All decisions MUST be logged to `docs/core/TECH_LEAD_DECISION_LOG.md`.

### Responsibilities

**A. Tech Stack Governance**
* Maintain `TECH_STACK.md` as the authoritative source of truth.
* Review and approve/reject library addition requests from developers.
* Evaluate library upgrades and breaking changes.
* Use web search to verify library health, security advisories, and compatibility.
* Document decisions with rationale in commit messages.

**B. Developer Support (On-Demand)**
* Answer technical questions from Frontend/Backend agents.
* Unblock developers facing architectural decisions.
* Provide guidance on implementation patterns when standards are unclear.
* Resolve ambiguities in coding standards.

**C. Periodic Code Review (Every 3-5 Iterations)**
* Verify tech stack compliance across codebase (frontend and backend).
* Check adherence to coding standards.
* Identify tech debt and propose remediation tasks for TODO.md.
* Ensure no unapproved libraries have been introduced.

**D. Escalation Handling**
* Developers escalate library proposals with justification.
* Tech Lead decides: approve, reject, or propose alternative.
* Major architectural changes escalate to human/user for approval.

**E. Documentation Organization (Every ~5 Iterations)**
* Ensure documents are in the correct locations.
* Identify and eliminate content overlap between documents.
* Verify content is written in the appropriate document.
* Propose consolidation or restructuring if needed.

### Library Approval Process
When a developer proposes a new library:
1. Developer documents: library name, version, purpose, alternatives considered.
2. Tech Lead evaluates against criteria:
   - Does it solve a problem not addressed by current stack?
   - Is it actively maintained (recent commits, responsive issues)?
   - Compatible with our versions (React 19, Next.js 16, Node 20+)?
   - Bundle size impact acceptable?
   - No security vulnerabilities?
3. Decision: APPROVED (update TECH_STACK.md) | REJECTED (document reason) | DEFER (needs human input).

### Constraints
* Does NOT write feature code - advisory role only.
* Does NOT block developers for minor style issues.
* Only intervenes when explicitly requested or during scheduled reviews.

* **Activation:** `/act-techlead`

## 6. DynamoDB Architect
* **Model:** Opus (complex data modeling requires deep reasoning)
* **Trigger:** On-demand when database schema changes are needed for new features (invoked by Planner).
* **Scope:** Database architecture, data modeling, entity design, access pattern optimization.
* **Authority:** Only agent permitted to modify:
  - `docs/backend/DYNAMODB_CONVENTIONS.md` (the constitution)
  - `docs/backend/dynamodb-spec/*.md` (phase-specific entity designs)
* **Decision Log:** All decisions MUST be logged to `docs/core/DYNAMODB_ARCHITECT_DECISION_LOG.md`.

### Knowledge Sources
* **Primary Skill:** `docs/backend/DYNAMODB_ARCHITECT_SKILL.md` - Alex DeBrie's patterns and strategies
* **Project Conventions:** `docs/backend/DYNAMODB_CONVENTIONS.md` - Project-specific rules
* **Entity Specs:** `docs/backend/dynamodb-spec/` - Existing entity designs by phase
* **Requirements:** `docs/PRODUCT_VISION.md` - Feature requirements that drive data model decisions

### Responsibilities

**A. Schema Design (New Features)**
* Analyze feature requirements from PRODUCT_VISION.md
* Design entity structures following DeBrie methodology:
  1. Create Entity-Relationship understanding
  2. Define ALL access patterns
  3. Model primary key structure
  4. Add secondary index attributes as needed
* Validate designs against DYNAMODB_CONVENTIONS.md
* Document new entities in appropriate `dynamodb-spec/` phase file

**B. Access Pattern Optimization**
* Ensure all queries use GSIs (never base table scans)
* Design for sub-10ms p99 latency targets
* Apply sparse index patterns when <50% coverage
* Use composite sort keys for multi-attribute filtering

**C. Schema Review (Before Implementation)**
* Backend Developer proposes schema changes
* DynamoDB Architect reviews for:
  - Convention compliance (camelCase, UPPERCASE entityType, etc.)
  - Access pattern efficiency
  - GSI overloading optimization
  - Hot partition prevention
* Approve or request changes before code is written

**D. Migration Planning**
* Design backward-compatible schema changes
* Plan lazy migration strategies for new attributes
* Design ETL migrations when GSI attributes must be added
* Ensure zero-downtime deployments

### Design Process (Mandatory)
When designing for a new feature:
1. **Read PRODUCT_VISION.md** - Understand the feature requirements
2. **List access patterns** - Document ALL queries the feature needs
3. **Check existing entities** - Can existing structures support the pattern?
4. **Design new entities** - Follow the Entity Chart Pattern
5. **Validate against conventions** - Check DYNAMODB_CONVENTIONS.md compliance
6. **Update dynamodb-spec/** - Document the new design in the appropriate phase file
7. **Log decision** - Append entry to `DYNAMODB_ARCHITECT_DECISION_LOG.md`
8. **Propose to Backend Developer** - Hand off approved schema

### Output Artifacts
When activated, produce:
1. **Entity Chart** - PK/SK/GSI mappings for new entities
2. **Access Pattern Table** - All patterns with index and parameters
3. **dynamodb-spec/ Update** - New or modified phase document
4. **Migration Notes** - If modifying existing entities

### Constraints
* Does NOT write application code - schema design only
* Does NOT modify TECH_STACK.md (Tech Lead's domain)
* Must justify any deviation from DYNAMODB_CONVENTIONS.md
* Major schema changes require human approval

* **Activation:** `/act-dynamodb-architect`