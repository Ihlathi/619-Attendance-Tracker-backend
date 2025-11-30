# Attendance Tracker Backend API Documentation

This document details the API endpoints and usage for the Attendance Tracker Backend, hosted as a Google Apps Script Web App.

## Base Configuration

**Base URL**: `[DEPLOYMENT_URL]` (Replace with actual script deployment URL)

**Content-Type**: `application/json`

**Method**: All requests must be sent via `POST` method. The backend handles `doPost(e)` to process requests.

## Authentication

All requests must include a valid Google ID Token in the `token` field of the JSON body.
The backend verifies this token to identify the user (email) and checks permissions based on their role.

**Roles**:
*   `STANDARD`: Default role for all users. Can check in and view own stats.
*   `ELEVATED`: Can manage meetings, view private stats, and manage lower-level user data.
*   `ADMIN`: Full system access.

## Request Format

The request body must be a JSON object with the following structure:

```json
{
  "action": "ACTION_NAME",
  "token": "GOOGLE_ID_TOKEN",
  ... (action specific parameters)
}
```

## Response Format

The API returns a JSON object.

**Success Response**:
```json
{
  "status": "success",
  "data": { ... }
}
```

**Error Response**:
```json
{
  "status": "error",
  "message": "Error description"
}
```

---

## Actions

### User Management

#### `setUserRole`
*   **Description**: Updates a user's role.
*   **Permission**: `ADMIN`
*   **Parameters**:
    *   `email` (string): Target user's email.
    *   `role` (string): New role (`STANDARD`, `ELEVATED`, `ADMIN`).

#### `setUserSubteams`
*   **Description**: Updates a user's subteams.
*   **Permission**: `ELEVATED`
*   **Parameters**:
    *   `email` (string): Target user's email.
    *   `subteams` (array of strings): List of subteams.

#### `setUserPosition`
*   **Description**: Updates a user's position.
*   **Permission**: `ELEVATED`
*   **Parameters**:
    *   `email` (string): Target user's email.
    *   `position` (string): New position.

#### `getAllUsers`
*   **Description**: Retrieves a list of all users.
*   **Permission**: `ELEVATED`
*   **Parameters**: None.
*   **Returns**: `{ users: [ ... ] }`

### Meeting Management

#### `createMeeting`
*   **Description**: Creates a new meeting (or series of recurring meetings).
*   **Permission**: `ELEVATED`
*   **Parameters**:
    *   `startTime` (ISO string): Start time.
    *   `endTime` (ISO string): End time.
    *   `lat` (number): Latitude.
    *   `lng` (number): Longitude.
    *   `radius` (number): Allowed radius in meters.
    *   `description` (string): Meeting description.
    *   `type` (string): Meeting type.
    *   `value` (number): Point value.
    *   `checkInWindowBefore` (number, optional): Minutes before start to open check-in (default 15).
    *   `checkInWindowAfter` (number, optional): Minutes after start to close on-time check-in (default 5).
    *   `recurring` (object, optional): `{ enabled: boolean, count: number }`
*   **Returns**: `{ success: true, meetingIds: [ ... ] }`

#### `editMeeting`
*   **Description**: Edits an existing meeting.
*   **Permission**: `ELEVATED` (if future), `ADMIN` (if past/started).
*   **Parameters**:
    *   `meetingId` (string): ID of the meeting.
    *   `updates` (object): Fields to update.

#### `deleteMeeting`
*   **Description**: Deletes a meeting.
*   **Permission**: `ELEVATED` (if future), `ADMIN` (if past/started).
*   **Parameters**:
    *   `meetingId` (string): ID of the meeting.

#### `getUpcomingMeetings`
*   **Description**: Gets a list of upcoming meetings.
*   **Permission**: `STANDARD`
*   **Parameters**:
    *   `numberOfMeetings` (number, optional): Limit results.
*   **Returns**: `{ meetings: [ ... ] }`

### Check-In

#### `checkIn`
*   **Description**: Checks a user into a meeting.
*   **Permission**: `STANDARD` (self), `ELEVATED` (manual override for others).
*   **Parameters**:
    *   `meetingId` (string): ID of the meeting.
    *   `lat` (number): User's current latitude.
    *   `lng` (number): User's current longitude.
    *   `manualOverride` (boolean, optional): If true, bypasses location/time checks (requires `ELEVATED`).
    *   `overrideEmail` (string, optional): Email of user to check in if `manualOverride` is true.
*   **Returns**: `{ success: true, wasOnTime: boolean, pendingBadgeId: string }`

### Badges

#### `getBadge`
*   **Description**: Gets details of a specific badge.
*   **Permission**: `STANDARD`
*   **Parameters**:
    *   `badgeId` (string): ID of the badge.

#### `getUserBadges`
*   **Description**: Gets all badges for a user.
*   **Permission**: `STANDARD`
*   **Parameters**:
    *   `email` (string, optional): Target email (defaults to requestor).

#### `getAllBadges`
*   **Description**: Gets all badges in the system.
*   **Permission**: `ADMIN`
*   **Parameters**: None.

### Excuses

#### `requestExcuse`
*   **Description**: Submits an excuse request for a meeting.
*   **Permission**: `STANDARD`
*   **Parameters**:
    *   `meetingId` (string): ID of the meeting.
    *   `reason` (string): Reason for excuse.

#### `approveExcuse`
*   **Description**: Approves or denies an excuse.
*   **Permission**: `ELEVATED`
*   **Parameters**:
    *   `excuseId` (string): ID of the excuse.
    *   `approve` (boolean/string): Approval status (`true`, `false`, or status string).

#### `excuseStudent`
*   **Description**: Manually excuses a student (creates approved excuse + valid check-in).
*   **Permission**: `ELEVATED`
*   **Parameters**:
    *   `meetingId` (string): ID of the meeting.
    *   `studentEmail` (string): Student's email.
    *   `reason` (string): Reason.

### Statistics

#### `getMeetingStatsPublic`
*   **Description**: Basic stats for a meeting (count, on-time %).
*   **Permission**: `STANDARD`
*   **Parameters**:
    *   `meetingId` (string): ID of the meeting.

#### `getMeetingStatsPrivate`
*   **Description**: Detailed stats for a meeting (list of attendees).
*   **Permission**: `ELEVATED`
*   **Parameters**:
    *   `meetingId` (string): ID of the meeting.

#### `getUserStats`
*   **Description**: Stats for a specific user.
*   **Permission**: `STANDARD`
*   **Parameters**:
    *   `email` (string, optional): Target email (defaults to requestor).

#### `getTeamwideStatsPublic`
*   **Description**: General team stats (avg attendance, active members).
*   **Permission**: `STANDARD`
*   **Parameters**: None.

#### `getTeamwideStatsPrivate`
*   **Description**: Detailed team stats (subteam breakdown, streak leaders).
*   **Permission**: `ELEVATED`
*   **Parameters**: None.

#### `getStreakLeaderboard`
*   **Description**: Top 20 streak leaderboard.
*   **Permission**: `STANDARD`
*   **Parameters**: None.

### Admin Utilities

#### `setUserStreaks`
*   **Description**: Manually sets a user's streak values.
*   **Permission**: `ADMIN`
*   **Parameters**:
    *   `email` (string): Target email.
    *   `currentStreak` (number): New current streak.
    *   `longestStreak` (number): New longest streak.

#### `recomputeBadgeCounts`
*   **Description**: Triggers re-computation of badge counts.
*   **Permission**: `ADMIN`
*   **Parameters**: None.
