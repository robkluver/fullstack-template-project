# Plan: Google Calendar Import
**Date:** Wed Nov 26 06:17:51 UTC 2025
**Directory:** docs/iterations/2025-11-26_0617_Google-Calendar-Import
**Gherkin Spec:** `docs/specs/google-calendar-import.feature`
**DynamoDB Spec:** `docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md`
**Requirements:** `docs/PRODUCT_VISION.md` (New Features > Google Calendar Import)

## 1. Objective

Enable users to import calendar events from Google Calendar into Nexus with OAuth 2.0 authentication, incremental sync, and conflict detection that preserves local modifications.

## 2. Schema Design (APPROVED)

**DynamoDB Architect Decision:** See `docs/core/DYNAMODB_ARCHITECT_DECISION_LOG.md` (2025-11-26)

### New Entity: NOTIFICATION
- Purpose: General-purpose notification system
- GSI3 for unread badge queries (`USER#<id>#NOTIF#UNREAD`)
- Supports: `GOOGLE_IMPORT`, `REMINDER_DUE`, `TASK_OVERDUE` types

### Modified Entity: EVENT
- New attributes: `googleEventId`, `googleCalendarId`, `googleSyncedAt`, `googleEtag`
- Lazy migration (no ETL)

### Modified Entity: USER_META
- New attributes: `googleOAuth` (tokens), `googleCalendarSync` (sync state)
- Lazy migration (no ETL)

## 3. Proposed Changes

### Backend (apps/api/)

#### 3.1 OAuth Endpoints
- [ ] `GET /oauth/google/authorize` - Generate OAuth authorization URL
- [ ] `POST /oauth/google/callback` - Exchange auth code for tokens
- [ ] `DELETE /oauth/google/revoke` - Revoke access and delete tokens

#### 3.2 Google Calendar Integration
- [ ] `POST /users/:userId/google-calendar/import` - Trigger import
- [ ] `GET /users/:userId/google-calendar/status` - Get connection status

#### 3.3 Notification Endpoints
- [ ] `GET /users/:userId/notifications` - List notifications (with unread count)
- [ ] `GET /users/:userId/notifications/:id` - Get single notification
- [ ] `PATCH /users/:userId/notifications/:id` - Update status (read/dismissed)
- [ ] `DELETE /users/:userId/notifications/:id` - Delete notification

#### 3.4 Google Calendar Service
- [ ] Create `GoogleCalendarService` class
- [ ] Implement token refresh logic
- [ ] Implement `fetchEvents()` with incremental sync (syncToken)
- [ ] Implement `mapGoogleEventToNexus()` converter

#### 3.5 Import Service
- [ ] Create `GoogleCalendarImportService` class
- [ ] Implement conflict detection logic
- [ ] Implement first import (full sync)
- [ ] Implement incremental import (delta sync)
- [ ] Create notification on import completion

#### 3.6 Repository Layer
- [ ] Create `NotificationRepository` with CRUD operations
- [ ] Add `findByGoogleEventId()` to EventRepository
- [ ] Add Google OAuth methods to UserMetaRepository

### Frontend (apps/web/)

#### 3.7 Settings - Integrations Section
- [ ] Create `IntegrationsSection` component
- [ ] Create `GoogleCalendarCard` component
  - Shows connection status
  - Connect/Disconnect buttons
  - Import button
  - Last sync timestamp
- [ ] Implement OAuth redirect flow

#### 3.8 Notification System
- [ ] Create `NotificationIcon` component (bell with badge)
- [ ] Create `NotificationDropdown` component (menu)
- [ ] Create `NotificationItem` component
- [ ] Create `ImportResultsModal` component
- [ ] Create notification Zustand store with persistence
- [ ] Add notification icon to Sidebar (bottom section)

#### 3.9 API Integration
- [ ] Add Google OAuth API client methods
- [ ] Add notification API client methods
- [ ] Add Google Calendar import API client method

### Shared (packages/shared/)

#### 3.10 Type Definitions
- [ ] Add `Notification` type
- [ ] Add `NotificationType` enum
- [ ] Add `NotificationStatus` enum
- [ ] Add `GoogleOAuthStatus` type
- [ ] Add `GoogleImportResult` type
- [ ] Add Google sync fields to `Event` type

## 4. Implementation Order

**Phase A: Backend Foundation**
1. Notification entity and repository
2. Notification API endpoints
3. Google OAuth endpoints

**Phase B: Google Integration**
4. Google Calendar service (API client)
5. Import service with conflict detection
6. Import endpoint

**Phase C: Frontend - Notifications**
7. Notification store
8. Notification UI components
9. Add to Sidebar

**Phase D: Frontend - Settings**
10. Integrations section
11. Google Calendar card
12. OAuth flow integration

## 5. Verification Plan

### Automated Tests
- [ ] Unit tests for NotificationRepository
- [ ] Unit tests for GoogleCalendarService
- [ ] Unit tests for GoogleCalendarImportService (conflict detection)
- [ ] Integration tests for notification API endpoints
- [ ] Integration tests for OAuth flow
- [ ] All Gherkin scenarios pass

### Manual Testing
- [ ] OAuth flow with real Google account
- [ ] First import with various event types
- [ ] Incremental import with new/changed events
- [ ] Conflict detection with local modifications
- [ ] Notification badge updates correctly
- [ ] Notification persistence across sessions

## 6. Dependencies

### External
- Google Calendar API v3
- Google OAuth 2.0 (`googleapis` npm package)

### Internal
- Existing EVENT entity structure
- Existing USER_META entity structure
- Existing Sidebar component

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Google API rate limits | Implement exponential backoff, batch requests |
| Token expiration during long import | Refresh token before import, handle mid-import refresh |
| Large calendar (>1000 events) | Paginate import, show progress indicator |
| Recurring event complexity | Map RRULE 1:1, handle exceptions as INSTANCE |

## 8. Out of Scope (Future Enhancements)

- Bidirectional sync (Nexus → Google)
- Multiple calendar selection
- Manual conflict resolution UI
- Real-time sync (webhook/push notifications)
