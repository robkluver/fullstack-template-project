# Nexus - Project Roadmap & Status

**Last Updated:** 2025-11-25

> **Authoritative Sources:**
> - Product Vision & Requirements: [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md)
> - DynamoDB Specification: [`docs/backend/dynamodb-spec/01-OVERVIEW.md`](docs/backend/dynamodb-spec/01-OVERVIEW.md)
> - Design Guidelines: [`docs/frontend/DESIGN_GUIDELINES.md`](docs/frontend/DESIGN_GUIDELINES.md)

---

## Feature Status Dashboard

| Feature / Epic | Planner | Frontend | Backend | QA/Verify | Status |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **0. Schema Refactor** | Done | - | Done | Pending | *Done* |
| **1. Foundation (App Shell)** | Done | Done | Done | Pending | *Done* |
| **2. Calendar** | Done | Done | Done | Pending | *Done* |
| **3. Tasks** | Done | Done | Done | Pending | *Done* |
| **4. Reminders** | Done | Done | Done | Pending | *Done* |
| **5. Notes** | Done | Done | Done | Pending | *Done* |
| **6. Integration (Unified Agenda)** | Done | Done | Done | Pending | *Done* |
| **7. OAuth 2.0 Auth** | Done | Done | Done | Pending | *Done* |
| **8. Tailwind CSS Refactor** | Done | Done | - | Pending | *Done* |

*(Legend: Backlog, Pending, In Progress, Done)*

---

## IMMEDIATE: Schema Refactor Task

**Priority: P0 - COMPLETE**

The Calendar handlers have been updated to match the new DynamoDB specification (v3.0).

### Backend - Schema Alignment ✓ COMPLETE
* [x] **Refactor Calendar handlers** to align with `docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md`
  - Updated doc references in all handlers
  - Added `links: []` attribute for cross-linking support
  - Existing key patterns (GSI1, GSI2) already correct
* [x] **Add GSI3 and GSI4 support** to serverless.yml
  - GSI3-TaskStatus for Kanban views (Phase 2)
  - GSI4-CrossLinks for reverse lookups (Phase 5)
  - DynamoDB Streams enabled (NEW_AND_OLD_IMAGES)
* [x] Update `serverless.yml` DynamoDB table definition
* [x] Add USER_META handlers (GET/PATCH /users/:userId/meta)
* [x] Updated client.ts with GSI3_NAME and GSI4_NAME exports

---

## Phase 1: Foundation (App Shell)

> **Reference:** [Product Vision - Phase 1](docs/PRODUCT_VISION.md#phase-1-foundation)

### Backend ✓ COMPLETE
* [x] DynamoDB ProductivityData table configured
* [x] GSI1-YearView for calendar queries
* [x] GSI2-RecurrenceLookup for recurring events
* [x] OAuth 2.0 authentication endpoints
* [x] Basic Calendar CRUD handlers

### Frontend ✓ COMPLETE
* [x] App shell and navigation layout (`AppShell.tsx`, `Sidebar.tsx`)
* [x] Command Palette (Cmd+K) - Actions, navigation, fuzzy search
* [x] Settings & Preferences page (`/settings`)
* [x] Sidebar navigation with icons
* [x] Theme support (Light/Dark/Auto) with system detection
* [x] Design system CSS tokens (colors, typography, spacing)
* [x] Route pages: Home, Calendar, Tasks, Reminders, Notes

---

## Phase 2: Calendar

> **Reference:**
> - [Product Vision - Calendar](docs/PRODUCT_VISION.md#1-calendar)
> - [DynamoDB Spec - Phase 1 Calendar](docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md)
> - [REST API Spec](docs/backend/dynamodb-spec/08-REST-API.md)

### Backend ✓ COMPLETE
* [x] `GET /users/:userId/agenda` (week/agenda view)
* [x] `GET /users/:userId/events/:eventId` (single event)
* [x] `POST /users/:userId/events` (create event)
* [x] `PATCH /users/:userId/events/:eventId` (update with optimistic locking)
* [x] `DELETE /users/:userId/events/:eventId` (delete event)
* [x] `POST /users/:userId/recurring` (create recurring master)
* [x] `GET /users/:userId/events/:masterId/series` (get recurring series)
* [x] `DELETE /users/:userId/events/:masterId/future` (end recurring series)
* [x] **Aligned handlers with new schema** (see Schema Refactor above)
* [x] Add USER_META entity support (GET/PATCH /users/:userId/meta)

### Frontend ✓ COMPLETE
* [x] Week view (horizontal timeline, default)
* [x] Day view (vertical timeline, 30-min slots)
* [x] Month view (traditional grid, 6 weeks)
* [x] Year view (12 mini-months, event indicators)
* [x] Event card component (color, time, location, status)
* [x] Event creation/edit modal
* [x] API client with React Query integration
* [x] Calendar page with navigation controls
* [x] Keyboard shortcuts (t=today, arrows=navigate, 1-5=views)
* [x] Agenda view (chronological list)
* [x] Quick-add bar (double-click empty slot)
* [x] Drag-to-reschedule
* [x] Drag-to-resize duration
* [x] Recurrence UI (Daily/Weekly/Monthly/Yearly)
* [x] Floating time support

---

## Phase 3: Tasks

> **Reference:**
> - [Product Vision - Tasks](docs/PRODUCT_VISION.md#2-tasks)
> - [DynamoDB Spec - Phase 2 Tasks](docs/backend/dynamodb-spec/04-PHASE2-TASKS.md)

### Backend ✓ COMPLETE
* [x] Add GSI3 for Kanban status queries (done in Schema Refactor)
* [x] `GET /users/:userId/tasks` (Kanban board - grouped by status)
* [x] `GET /users/:userId/tasks/:taskId` (single task)
* [x] `POST /users/:userId/tasks` (create task)
* [x] `PATCH /users/:userId/tasks/:taskId` (update task)
* [x] `DELETE /users/:userId/tasks/:taskId` (delete task)
* [x] Status change via PATCH (update GSI3PK)
* [x] Priority encoding (P1-P5 in GSI3SK)
* [x] Effort estimation (Fibonacci scale validation)
* [ ] Auto-archive logic (completed > 24hrs) - deferred to stream processor

### Frontend ✓ COMPLETE
* [x] Kanban board (4 columns: Backlog, In Progress, Completed, Archived)
* [x] Task cards (title, due date, effort badge, labels)
* [x] Drag between columns (optimistic UI)
* [x] List view (sortable table)
* [x] Quick-add (Cmd+T)
* [x] Task detail/edit modal
* [x] Priority visualization (color bars)
* [ ] Multi-sort support - deferred
* [ ] Keyboard shortcuts (Space=toggle, e=edit, d=delete) - deferred

---

## Phase 4: Reminders

> **Reference:**
> - [Product Vision - Reminders](docs/PRODUCT_VISION.md#3-reminders)
> - [DynamoDB Spec - Phase 3 Reminders](docs/backend/dynamodb-spec/05-PHASE3-REMINDERS.md)

### Backend ✓ COMPLETE
* [x] `GET /users/:userId/reminders` (pending reminders)
* [x] `GET /users/:userId/reminders/:reminderId` (single reminder)
* [x] `POST /users/:userId/reminders` (create reminder)
* [x] `PATCH /users/:userId/reminders/:reminderId` (update/snooze)
* [x] `DELETE /users/:userId/reminders/:reminderId` (delete)
* [x] Snooze state machine (PENDING -> SNOOZED)
* [x] Complete/dismiss transitions (with TTL for auto-cleanup)
* [ ] Stream-based notification triggers - deferred

### Frontend ✓ COMPLETE
* [x] Reminder list view
* [x] Reminder creation modal
* [x] Snooze dropdown (10min, 1hr, tomorrow 9am, next week)
* [x] Complete/dismiss actions
* [x] Color picker
* [ ] Browser notification support - deferred
* [ ] Calendar integration (bell icon in Day/Week views) - deferred
* [ ] Audio chime on trigger - deferred
* [ ] Command Palette integration (! syntax) - deferred

---

## Phase 5: Notes

> **Reference:**
> - [Product Vision - Notes](docs/PRODUCT_VISION.md#4-notes)
> - [DynamoDB Spec - Phase 4 Notes](docs/backend/dynamodb-spec/06-PHASE4-NOTES.md)

### Backend ✓ COMPLETE
* [x] `GET /users/:userId/notes` (all notes)
* [x] `GET /users/:userId/notes/:noteId` (single note)
* [x] `POST /users/:userId/notes` (create note)
* [x] `PATCH /users/:userId/notes/:noteId` (update note)
* [x] `DELETE /users/:userId/notes/:noteId` (archive note)
* [x] Pin/unpin support
* [x] Color coding (hex colors)
* [x] Tag filtering (via query param)
* [ ] Full-text search (OpenSearch) - deferred

### Frontend ✓ COMPLETE
* [x] Grid view (responsive columns)
* [x] List view (single column)
* [x] Note cards (title, preview, color tint, tags)
* [x] Note editor with Markdown
* [x] Live preview toggle (Cmd+P)
* [x] Pin/archive actions
* [x] Color picker (12 colors)
* [x] Keyboard shortcuts (Cmd+Shift+N=new note)
* [x] Tag filtering
* [x] Show/hide archived toggle

---

## Phase 6: Integration (Unified Agenda) ✓ MVP COMPLETE

> **Reference:**
> - [Product Vision - Unified Agenda](docs/PRODUCT_VISION.md#5-unified-agenda--home)
> - [DynamoDB Spec - Phase 5 Cross-Linking](docs/backend/dynamodb-spec/07-PHASE5-CROSS-LINKING.md)

### Backend ✓ COMPLETE
* [x] `GET /users/:userId/unified-agenda` (events + tasks + reminders)
* [x] GSI4 already configured in table (Phase 0 schema refactor)

### Frontend ✓ COMPLETE
* [x] Home/Agenda view (timeline of events, tasks, reminders)
* [x] Grouped by Today/Tomorrow/This Week
* [x] Summary bar with item counts by type
* [x] AgendaItemCard with type icons and priority colors
* [x] Days ahead selector (7/14/30)

### Deferred to Post-MVP
* [ ] Cross-link autocomplete (#tasks, @notes, !events)
* [ ] Link rendering as clickable pills
* [ ] Backlinks section in detail views
* [ ] Global search (Cmd+K)
* [ ] Link parsing from Markdown

---

## Infrastructure & Operations

### OAuth 2.0 Authentication ✓ COMPLETE
* [x] `POST /oauth/token` (password + refresh_token grants)
* [x] `POST /oauth/revoke` (RFC 7009 compliant)
* [x] `GET /oauth/userinfo` (OpenID Connect)
* [x] JWT utilities (15min access, 24hr refresh)
* [x] Argon2id password hashing
* [x] Auth middleware
* [x] Frontend auth client (login, logout, token refresh)
* [x] AuthContext and AuthProvider
* [x] Login page (`/login`)
* [x] Protected routes (redirect to login if unauthenticated)
* [x] Logout button in Sidebar
* [ ] Authorization code grant with PKCE - deferred

### Storybook Component Library ✓ COMPLETE
* [x] Storybook 8 setup with react-webpack5
* [x] Stories for all card components (EventCard, TaskCard, ReminderCard, NoteCard, AgendaItemCard)
* [x] Stories for calendar views (MonthView, WeekView, DayView)
* [x] Stories for navigation (Sidebar)
* [x] Stories for interactive components (CommandPalette mock)
* [x] Mock data patterns for all stories

### DevOps - Pending
* [ ] CloudWatch alarms (ReadThrottle, WriteThrottle)
* [ ] X-Ray tracing setup
* [ ] CI/CD pipeline
* [ ] Staging environment
* [ ] Load testing (1000 req/s target)

---

## Phase 8: Tailwind CSS Refactor

> **Goal:** Convert all components from styled-jsx to Tailwind CSS utility classes.
> **Reference:** [TECH_STACK.md](docs/core/TECH_STACK.md) - Tailwind CSS 4.x

### Frontend ✓ COMPLETE
* [x] Audit all components using styled-jsx (28 files identified)
* [x] Configure Tailwind 4 theme with @theme block and custom @utility blocks
* [x] Convert layout components (AppShell, Sidebar, AuthenticatedLayout)
* [x] Convert card components (EventCard, TaskCard, ReminderCard, NoteCard, AgendaItemCard)
* [x] Convert calendar views (MonthView, WeekView, DayView, YearView, AgendaView)
* [x] Convert form components (EventModal, TaskModal, ReminderModal, NoteModal)
* [x] Convert page components (home, login, calendar, tasks, reminders, notes, settings)
* [x] Convert interactive components (CommandPalette, KanbanBoard, QuickAdd)
* [x] Update Storybook stories for Tailwind
* [x] Verify build and all stories render correctly

---

## Reference Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| **Product Vision** | `docs/PRODUCT_VISION.md` | Top-level requirements and feature specs |
| **Design Guidelines** | `docs/frontend/DESIGN_GUIDELINES.md` | UX, UI, interaction specifications |
| **DynamoDB Overview** | `docs/backend/dynamodb-spec/01-OVERVIEW.md` | Database architecture and roadmap |
| **DynamoDB Conventions** | `docs/backend/DYNAMODB_CONVENTIONS.md` | Design principles (THE LAW) |
| **Table Config & Indexes** | `docs/backend/dynamodb-spec/02-TABLE-CONFIG-AND-INDEXES.md` | GSI definitions, schema |
| **REST API Spec** | `docs/backend/dynamodb-spec/08-REST-API.md` | All endpoint contracts |
| **Testing & Deployment** | `docs/backend/dynamodb-spec/09-TESTING-AND-DEPLOYMENT.md` | QA and operations |
| **Auth Strategy** | `docs/core/AUTH_STRATEGY.md` | OAuth 2.0 implementation |

### Phase-Specific DynamoDB Docs
| Phase | Document |
|-------|----------|
| Calendar | `docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md` |
| Tasks | `docs/backend/dynamodb-spec/04-PHASE2-TASKS.md` |
| Reminders | `docs/backend/dynamodb-spec/05-PHASE3-REMINDERS.md` |
| Notes | `docs/backend/dynamodb-spec/06-PHASE4-NOTES.md` |
| Cross-Linking | `docs/backend/dynamodb-spec/07-PHASE5-CROSS-LINKING.md` |

---

## Backlog (Post-MVP)

* [ ] iCalendar Import/Export
* [ ] Password Reset flow
* [ ] Email Notifications
* [ ] Mobile app (React Native)
* [ ] Browser extension
* [ ] API rate limiting

---

## Phase 9: Google Calendar Import

> **Reference:** [Product Vision - New Features](docs/PRODUCT_VISION.md#new-features)

**Status: Next Up**

### Backend
* [ ] Add Google OAuth 2.0 endpoints (authorization URL, token exchange, token refresh)
* [ ] Add Google Calendar API integration (fetch primary calendar events)
* [ ] Add sync metadata fields to EVENT entity (googleEventId, googleSyncedAt, googleEtag)
* [ ] Add NOTIFICATION entity to DynamoDB schema
* [ ] Create notification CRUD endpoints (GET/POST/PATCH/DELETE)
* [ ] Implement Google Calendar import logic with conflict detection
* [ ] Implement incremental sync (only changed events since last import)

### Frontend
* [ ] Add "Integrations" section to Settings page
* [ ] Create Google Calendar connection UI (Connect/Disconnect button)
* [ ] Add "Import from Google Calendar" button
* [ ] Create notification store (Zustand) with persistence
* [ ] Add notification icon to Sidebar with unread badge
* [ ] Create notification dropdown/menu component
* [ ] Create import results modal (imported count, conflicts list)
* [ ] Add conflict resolution UI

---

**Current Iteration:** [2025-11-26_0617_Google-Calendar-Import](docs/iterations/2025-11-26_0617_Google-Calendar-Import)
