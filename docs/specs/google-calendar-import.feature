Feature: Google Calendar Import
  As a Nexus user
  I want to import events from my Google Calendar
  So that I can see all my appointments in one place

  Background:
    Given I am logged in as a registered user
    And I am on the Settings page

  # =============================================================================
  # Google Calendar Connection
  # =============================================================================

  @oauth @connection
  Scenario: Connect Google Calendar for the first time
    Given I have not connected my Google Calendar
    When I click "Connect Google Calendar"
    Then I should be redirected to Google's OAuth consent screen
    And the consent screen should request "calendar.readonly" permission

  @oauth @connection
  Scenario: Complete Google OAuth authorization
    Given I am on Google's OAuth consent screen
    When I grant calendar access permission
    Then I should be redirected back to Nexus Settings
    And I should see "Connected" status
    And I should see my Google email address displayed
    And I should see an "Import from Google Calendar" button
    And I should see a "Disconnect" button

  @oauth @connection
  Scenario: Disconnect Google Calendar
    Given I have connected my Google Calendar
    When I click "Disconnect"
    Then I should see a confirmation dialog
    When I confirm the disconnection
    Then I should see "Not Connected" status
    And the "Connect Google Calendar" button should appear
    And my previously imported events should remain in Nexus

  @oauth @error
  Scenario: Handle OAuth authorization denied
    Given I am on Google's OAuth consent screen
    When I deny calendar access permission
    Then I should be redirected back to Nexus Settings
    And I should see an error message "Google Calendar access was denied"
    And I should see "Not Connected" status

  # =============================================================================
  # First Import
  # =============================================================================

  @import @first-import
  Scenario: First import from Google Calendar
    Given I have connected my Google Calendar
    And my Google Calendar has 50 events in the past year
    And my Google Calendar has 30 events in the next 2 years
    When I click "Import from Google Calendar"
    Then I should see a loading indicator
    And all 80 events should be imported into Nexus
    And a notification should be created with import results
    And the notification bell should show a red badge
    And I should see "Last sync: just now" in Settings

  @import @first-import
  Scenario: View first import results notification
    Given I have completed a first import with 80 events
    And a notification was created
    When I click the notification bell icon
    Then I should see "Google Calendar Import Complete" notification
    When I click the notification
    Then I should see a modal with:
      | Field            | Value                    |
      | Events imported  | 80                       |
      | Conflicts        | 0                        |

  # =============================================================================
  # Incremental Import
  # =============================================================================

  @import @incremental
  Scenario: Incremental import with new events
    Given I have previously imported events from Google Calendar
    And 5 new events were added to my Google Calendar since last import
    When I click "Import from Google Calendar"
    Then only the 5 new events should be imported
    And existing events should not be duplicated
    And the notification should show "5 events imported"

  @import @incremental
  Scenario: Incremental import with updated events (no local changes)
    Given I have previously imported "Team Meeting" from Google Calendar
    And I have NOT modified "Team Meeting" in Nexus
    And "Team Meeting" was rescheduled in Google Calendar
    When I click "Import from Google Calendar"
    Then "Team Meeting" should be updated with the new time from Google
    And no conflict should be reported

  # =============================================================================
  # Conflict Detection
  # =============================================================================

  @import @conflict
  Scenario: Detect conflict when local event was modified
    Given I have previously imported "Team Meeting" from Google Calendar
    And I changed the title to "Team Standup" in Nexus
    And the same event was also modified in Google Calendar
    When I click "Import from Google Calendar"
    Then "Team Standup" should NOT be overwritten
    And a conflict should be recorded
    And the notification should show "1 conflict"

  @import @conflict
  Scenario: View conflict details in import results
    Given I have completed an import with 10 events and 2 conflicts
    When I click the import notification
    Then I should see a modal showing:
      | Field            | Value                    |
      | Events imported  | 10                       |
      | Conflicts        | 2                        |
    And I should see a list of conflicting events with:
      | Event Title      | Local Modified | Google Modified |
      | Team Standup     | Nov 25, 10:00  | Nov 26, 08:00   |
      | Project Review   | Nov 24, 14:30  | Nov 25, 09:00   |

  @import @conflict
  Scenario: No conflict when only Google changed (local unchanged)
    Given I have previously imported "Weekly Sync" from Google Calendar
    And I have NOT modified "Weekly Sync" in Nexus
    And "Weekly Sync" was updated in Google Calendar
    When I click "Import from Google Calendar"
    Then "Weekly Sync" should be updated with Google's changes
    And no conflict should be reported

  # =============================================================================
  # Recurring Events
  # =============================================================================

  @import @recurring
  Scenario: Import recurring event series
    Given my Google Calendar has a recurring "Daily Standup" event
    And it repeats every weekday at 9:00 AM
    When I click "Import from Google Calendar"
    Then a MASTER event should be created in Nexus
    And the RRULE should be "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
    And the event should appear on my Nexus calendar for weekdays

  @import @recurring
  Scenario: Import recurring event with exception
    Given my Google Calendar has a recurring "Weekly Team Meeting"
    And one instance on Dec 25 was cancelled
    And one instance on Dec 24 was rescheduled to 3 PM
    When I click "Import from Google Calendar"
    Then the MASTER event should have Dec 25 in exdate
    And an INSTANCE should be created for Dec 24 at 3 PM

  # =============================================================================
  # Notification System
  # =============================================================================

  @notification @badge
  Scenario: Notification badge shows unread count
    Given I have 3 unread notifications
    When I view the sidebar
    Then the notification bell should show a red badge
    And the badge should display "3"

  @notification @read
  Scenario: Mark notification as read
    Given I have an unread "Google Calendar Import Complete" notification
    When I click the notification to view details
    Then the notification should be marked as read
    And the unread count should decrease by 1

  @notification @dismiss
  Scenario: Dismiss notification
    Given I have a read notification
    When I click the dismiss button on the notification
    Then the notification should be removed from my list
    And it should not appear in future notification queries

  @notification @persistence
  Scenario: Notifications persist across sessions
    Given I have 2 unread notifications
    When I log out and log back in
    Then I should still see 2 unread notifications
    And the notification badge should still show "2"

  # =============================================================================
  # Settings UI
  # =============================================================================

  @settings @ui
  Scenario: View Integrations section when not connected
    Given I have not connected my Google Calendar
    When I navigate to Settings
    Then I should see an "Integrations" section
    And I should see a "Google Calendar" card
    And the card should show "Not Connected" status
    And I should see a "Connect Google Calendar" button

  @settings @ui
  Scenario: View Integrations section when connected
    Given I have connected my Google Calendar as "user@gmail.com"
    And my last import was on "Nov 26, 2025 at 10:30 AM"
    When I navigate to Settings
    Then I should see the "Google Calendar" card with:
      | Field            | Value                    |
      | Status           | Connected                |
      | Account          | user@gmail.com           |
      | Last sync        | Nov 26, 2025 at 10:30 AM |
    And I should see an "Import from Google Calendar" button
    And I should see a "Disconnect" button

  # =============================================================================
  # Error Handling
  # =============================================================================

  @error @network
  Scenario: Handle network error during import
    Given I have connected my Google Calendar
    And Google Calendar API is unavailable
    When I click "Import from Google Calendar"
    Then I should see an error message "Failed to connect to Google Calendar"
    And no notification should be created
    And my existing events should remain unchanged

  @error @token
  Scenario: Handle expired OAuth token
    Given I have connected my Google Calendar
    And my OAuth token has expired
    And the refresh token is still valid
    When I click "Import from Google Calendar"
    Then the token should be automatically refreshed
    And the import should complete successfully

  @error @token
  Scenario: Handle revoked OAuth access
    Given I have connected my Google Calendar
    And I revoked Nexus access from my Google account settings
    When I click "Import from Google Calendar"
    Then I should see an error message "Google Calendar access was revoked"
    And I should be prompted to reconnect
    And my connection status should change to "Not Connected"
