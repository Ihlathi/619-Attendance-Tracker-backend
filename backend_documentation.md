# Attendance Tracker Backend Documentation

## Overview
This Google Apps Script (GAS) project serves as the backend for the FRC Attendance Tracker. It exposes a JSON API via `doPost` (handled in `Controller.js`) and interacts with a Google Sheet as its database.

## Architecture
The project follows a layered architecture:
1.  **Controller (`Controller.js`)**: Entry point for web requests. Parses JSON payloads, verifies tokens, and dispatches actions to the Service layer.
2.  **Service (`Service.js`)**: Contains business logic (e.g., validating check-in times/locations, updating roles). Enforces permissions.
3.  **Database (`Database.js`)**: Handles direct interactions with the Google Sheet (Read, Create, Update).
4.  **Auth (`Auth.js`)**: Handles Google ID Token verification and domain validation (`carobotics.org`).
5.  **Models (`Models.js`)**: Defines the database schema and constants.

## Authentication
Authentication is handled via Google OAuth ID Tokens.
1.  The client sends a Google ID Token in the request payload (`token`).
2.  `Auth.verifyToken(token)` verifies the token with Google's API (`oauth2.googleapis.com/tokeninfo`).
3.  The user's email is extracted and validated against the allowed domain (`carobotics.org`).
4.  If valid, the email is used to identify the user in the system.

### Roles
-   **Standard**: Default role for new users. Can check in to meetings.
-   **Elevated**: Admin/Manager role. Can create meetings, update user roles, and perform manual overrides.

## Database Schema
The database consists of three sheets in the active spreadsheet:

### Users
-   **email** (ID): User's email address.
-   **role**: `standard` or `elevated`.
-   **name**: User's display name.
-   **createdAt**: ISO timestamp of creation.

### Meetings
-   **id**: Unique meeting ID (`m_timestamp`).
-   **title**: Meeting title.
-   **description**: Meeting description.
-   **startTime**: ISO timestamp.
-   **endTime**: ISO timestamp.
-   **lat**: Latitude of meeting location.
-   **lng**: Longitude of meeting location.
-   **radius**: Allowed radius in meters.
-   **checkInWindowBefore**: Minutes before start time when check-in opens.
-   **status**: `scheduled`, `cancelled`, or `archived`.
-   **createdAt**: ISO timestamp.

### CheckIns
-   **id**: Unique check-in ID (`c_timestamp`).
-   **meetingId**: ID of the meeting.
-   **userEmail**: Email of the user.
-   **timestamp**: ISO timestamp of check-in.
-   **lat**: User's latitude at check-in.
-   **lng**: User's longitude at check-in.
-   **status**: `valid` or `manual_override`.

## API Reference
All requests should be POST requests to the Web App URL.
**Content-Type**: `application/json`

### Common Payload Structure
```json
{
  "action": "actionName",
  "token": "GOOGLE_ID_TOKEN",
  ...params
}
```

### Actions

#### `createMeeting`
Creates a new meeting. Requires **Elevated** role.
-   **Payload**:
    ```json
    {
      "action": "createMeeting",
      "token": "...",
      "title": "General Assembly",
      "description": "Weekly meeting",
      "startTime": "2023-10-27T18:00:00Z",
      "endTime": "2023-10-27T20:00:00Z",
      "lat": 40.7128,
      "lng": -74.0060,
      "radius": 50,
      "checkInWindowBefore": 15
    }
    ```

#### `checkIn`
Checks a user into a meeting.
-   **Payload**:
    ```json
    {
      "action": "checkIn",
      "token": "...",
      "meetingId": "m_123456789",
      "lat": 40.7128,
      "lng": -74.0060
    }
    ```
-   **Manual Override** (Elevated only):
    ```json
    {
      "action": "checkIn",
      "token": "...",
      "meetingId": "m_123456789",
      "manualOverride": true,
      "userEmail": "student@carobotics.org"
    }
    ```

#### `updateUserRole`
Updates a user's role. Requires **Elevated** role.
-   **Payload**:
    ```json
    {
      "action": "updateUserRole",
      "token": "...",
      "targetEmail": "student@carobotics.org",
      "newRole": "elevated"
    }
    ```

#### `getUpcomingMeetings`
Returns a list of scheduled meetings that haven't ended.
-   **Payload**:
    ```json
    {
      "action": "getUpcomingMeetings",
      "token": "..."
    }
    ```

#### `getMeetingStats`
Returns attendance counts for a meeting. Requires **Elevated** role.
-   **Payload**:
    ```json
    {
      "action": "getMeetingStats",
      "token": "...",
      "meetingId": "m_123456789"
    }
    ```

## Setup
1.  Open the Google Apps Script editor.
2.  Run the `setup()` function in `Setup.js` to initialize the sheets and create the first Admin user.
3.  Deploy as a Web App (Execute as: **Me**, Access: **Anyone**).
