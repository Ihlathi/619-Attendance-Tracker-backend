# FRC Attendance Tracker Backend Documentation

## Overview
This Google Apps Script (GAS) project serves as the backend for the Team 619's Attendance Tracker. It exposes a JSON API via `doPost` (handled in `Controller.js`) and interacts with a Google Sheet as its database. It includes features for user management, meeting scheduling, geolocation-based check-ins, badge generation (via Pollinations.ai), and statistics.

## Architecture
The project follows a layered architecture:
1.  **Controller (`Controller.js`)**: Entry point. Parses JSON payloads, verifies tokens, and dispatches actions.
2.  **Service (`Service.js`)**: Core business logic (User, Meeting, Check-in, Excuses).
3.  **Badges (`Badges.js`)**: Handles badge generation using Pollinations.ai and Google Drive.
4.  **Stats (`Stats.js`)**: Calculates and returns statistics.
5.  **Database (`Database.js`)**: Direct Google Sheets interactions.
6.  **Auth (`Auth.js`)**: Google ID Token verification and permission checks.
7.  **Models (`Models.js`)**: Schema definitions and constants.

## Authentication
*   **Mechanism**: Google OAuth ID Tokens.
*   **Domain Restriction**: Users must have an email ending in `@carobotics.org`.
*   **Roles**:
    *   `standard`: Default. Can check in, view own stats.
    *   `elevated`: Manager/Lead. Can create meetings, manual override check-ins, approve excuses.
    *   `admin`: System Admin. Full access, including user role management and data maintenance.

## Database Schema
The database consists of the following sheets:

### Users
*   `email` (ID), `role`, `name`, `createdAt`, `subteams`, `position`, `currentStreak`, `longestStreak`

### Meetings
*   `id` (M-Timestamp-Base36), `title`, `description`, `startTime`, `endTime`, `lat`, `lng`, `radius`, `checkInWindowBefore`, `checkInWindowAfter`, `status`, `createdAt`, `lastEdited`

### CheckIns
*   `id` (C-Timestamp-Base36), `meetingId`, `userEmail`, `timestamp`, `lat`, `lng`, `status` (valid/manual_override), `wasOnTime`, `override`, `excused`

### Badges
*   `badgeId` (B-Timestamp-Base36), `ownerEmail`, `originalOwnerEmail`, `meetingId`, `timestamp`, `prompt`, `driveURL`, `status` (pending/ready/error)

### Excuses
*   `excuseId` (E-Timestamp-Base36), `meetingId`, `email`, `reason`, `timestamp`, `approved` (TRUE/FALSE/empty)

## API Reference
**Endpoint**: Web App URL
**Method**: POST
**Content-Type**: `application/json`

### Common Payload
```json
{
  "action": "ACTION_NAME",
  "token": "GOOGLE_ID_TOKEN",
  ...params
}
```

### Actions

#### User Management
*   `setUserRole` (Admin): `{ email, role }`
*   `setUserSubteams` (Elevated): `{ email, subteams: [] }`
*   `setUserPosition` (Elevated): `{ email, position }`
*   `editUserMeta` (Admin): `{ email, fields: { displayName, createdAt } }`

#### Meeting Management
*   `createMeeting` (Elevated): `{ title, description, startTime, endTime, lat, lng, radius, checkInWindowBefore, recurring: { enabled, count } }`
*   `editMeeting` (Elevated/Admin): `{ meetingId, updates: {} }`
*   `deleteMeeting` (Elevated/Admin): `{ meetingId }`
*   `getUpcomingMeetings` (Standard): Returns active and future meetings.

#### Check-In
*   `checkIn` (Standard/Elevated): `{ meetingId, lat, lng, manualOverride, overrideEmail }`
    *   Returns: `{ success, wasOnTime, pendingBadgeId }`

#### Badges
*   `getBadge`: `{ badgeId }`
*   `getUserBadges`: `{ email }`
*   `getAllBadges` (Admin): Returns all badges.

#### Excuses
*   `requestExcuse`: `{ meetingId, reason }`
*   `approveExcuse` (Elevated): `{ excuseId, approve: true/false }`
*   `excuseStudent` (Elevated): `{ meetingId, studentEmail, reason }`

#### Statistics
*   `getMeetingStatsPublic`: `{ meetingId }` -> `{ attendanceCount, onTimeCount, onTimePercent }`
*   `getMeetingStatsPrivate` (Elevated): `{ meetingId }` -> List of attendees with details.
*   `getUserStats`: `{ email }` -> `{ currentStreak, totalMeetings, attended, onTime, badges: [] }`
*   `getTeamwideStatsPublic`: `{ averageAttendance, averageOnTimePercent, totalMembers, activeMembers }`
*   `getTeamwideStatsPrivate` (Elevated): Includes subteam breakdown and streak leaders.
*   `getStreakLeaderboard`: Top 20 streak leaders.

#### Admin Utilities
*   `setUserStreaks` (Admin): `{ email, currentStreak, longestStreak }`
*   `recomputeBadgeCounts` (Admin)

## Setup Instructions

1.  **Create Spreadsheet**: Create a new Google Sheet.
2.  **Open Script Editor**: Extensions > Apps Script.
3.  **Copy Files**: Copy all `.js` files (`Controller.js`, `Service.js`, etc.) into the editor.
4.  **Run Setup**: Run the `setup()` function in `Setup.js`.
5.  **Set API Key**:
    *   Go to **Project Settings** (gear icon).
    *   Scroll to **Script Properties**.
    *   Click **Add script property**.
    *   Property: `POLLINATIONS_API_KEY`
    *   Value: `YOUR_API_KEY` (Get one from [enter.pollinations.ai](https://enter.pollinations.ai))
    *   Click **Save script properties**.
6.  **Deploy**: Deploy as Web App (Execute as: **Me**, Access: **Anyone**).

> [!NOTE]
> Badge generation is triggered automatically when a user checks in. No manual trigger setup is required.
