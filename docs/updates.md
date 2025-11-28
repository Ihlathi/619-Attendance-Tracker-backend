====================================================
              FRC ATTENDANCE SYSTEM
         FULL AND FINAL API SPECIFICATION
====================================================

============================================
1. UNIVERSAL FORMATTING RULES
============================================

All requests:
POST /webapp
{
  action: "string",
  token: "GoogleIDToken",
  ...payload
}

Backend extracts:
- email (string)
- role  (string: "standard" | "elevated" | "admin")


============================================
2. STANDARDIZED FIELD TYPES
============================================

TIMESTAMPS:
- ISO 8601 format, UTC recommended
  Example: "2025-02-01T18:00:00Z"

EMAILS:
- always lowercased
- must end with @carobotics.org

LATITUDE / LONGITUDE:
- floats, valid ranges:
  -90 ≤ lat ≤ 90
  -180 ≤ lng ≤ 180

ROLE VALUES:
- "standard"
- "elevated"
- "admin"

SUBTEAM VALUES:
- "mechanical"
- "electrical"
- "programming"
- "cad"
- "social-marketing"
- "sponsorship-fundraising"
- "spirit-awards"
- "outreach-recruitment"
- "drive"

POSITION VALUES:
- "none"
- "lead"

BOOLEAN:
- true or false

ARRAY:
- JSON array, e.g. ["programming", "drive"]


============================================
3. ID FORMATS (UNIFORM AND CONSISTENT)
============================================

USER IDENTIFIER:
- Always the email. There is no separate userId.

MEETING ID:
Format:  "M-" + <unixTimestampSeconds> + "-" + <3-char base36>
Example: "M-1738983000-K4A"

Rules:
- timestamp = meeting startTime converted to unix time
- suffix = random base36 of length 3 (0–9 + A–Z)
- must be unique

BADGE ID:
Format: "B-" + <unixTimestampSeconds> + "-" + <3-char base36>
Example: "B-1738983123-Z7X"

EXCUSE ID:
Format: "E-" + <unixTimestampSeconds> + "-" + <3-char base36>
Example: "E-1739000001-Q5D"


============================================
4. API ENDPOINTS
============================================


====================================================
A. USER MANAGEMENT
====================================================

--------------------------------------------
setUserRole  (admin only)
--------------------------------------------
Request:
{
  action: "setUserRole",
  email: "student@carobotics.org",
  role: "standard" | "elevated" | "admin"
}

Response:
{ success: true }


--------------------------------------------
setUserSubteams  (elevated, admin)
--------------------------------------------
Request:
{
  action: "setUserSubteams",
  email: "student@carobotics.org",
  subteams: ["programming", "drive"]
}

Notes:
- Replaces the user’s entire subteam list.

Response:
{ success: true }


--------------------------------------------
setUserPosition  (elevated, admin)
--------------------------------------------
Request:
{
  action: "setUserPosition",
  email: "student@carobotics.org",
  position: "none" | "lead"
}

Response:
{ success: true }


--------------------------------------------
editUserMeta  (admin only)
--------------------------------------------
Request:
{
  action: "editUserMeta",
  email: "student@carobotics.org",
  fields: {
    displayName: "New Name",
    createdAt: "2025-02-01T17:00:00Z"
  }
}

Response:
{ success: true }



====================================================
B. MEETING MANAGEMENT
====================================================

--------------------------------------------
createMeeting  (elevated, admin)
--------------------------------------------
Request:
{
  action: "createMeeting",
  title: "Build Night",
  description: "Shooter prototype",
  startTime: "2025-02-01T18:00:00Z",
  endTime:   "2025-02-01T21:00:00Z",
  lat: 38.12345,
  lng: -77.12345,
  radius: 60,
  checkInWindowBefore: 15,
  checkInWindowAfter:  5,
  recurring: {
    enabled: true,
    weeklyDay: 1,   // Monday
    count: 8
  }
}

Response:
{
  success: true,
  meetingIds: ["M-1738983000-K4A", "M-1739587800-L9C", ...]
}


--------------------------------------------
editMeeting  (elevated/admin)
--------------------------------------------
If meeting already started → admin only.

Request:
{
  action: "editMeeting",
  meetingId: "M-1738983000-K4A",
  updates: {
    title: "Build Night Updated",
    radius: 80
  }
}

Response:
{ success: true }


--------------------------------------------
deleteMeeting
--------------------------------------------
Permissions:
- elevated if meeting is in future
- admin if meeting is active or past

Request:
{
  action: "deleteMeeting",
  meetingId: "M-1738983000-K4A"
}

Response:
{ success: true }


--------------------------------------------
getUpcomingMeetings
--------------------------------------------
Returns both active and future meetings.

Request:
{ action: "getUpcomingMeetings" }

Response:
{
  meetings: [
    {
      meetingId,
      title,
      description,
      startTime,
      endTime,
      lat, lng, radius,
      checkInWindowBefore,
      checkInWindowAfter,
      createdAt,
      lastEdited
    }
  ]
}



====================================================
C. CHECK-IN
====================================================

--------------------------------------------
checkIn
--------------------------------------------
Request:
{
  action: "checkIn",
  meetingId: "M-1738983000-K4A",
  lat: 38.12345,
  lng: -77.12345,
  manualOverride: false,
  overrideEmail: null
}

Response:
{
  success: true,
  wasOnTime: true,
  badgeId: "B-1738983123-Z7X"
}



====================================================
D. BADGES
====================================================

--------------------------------------------
getBadge  (admin or owner)
--------------------------------------------
Request:
{
  action: "getBadge",
  badgeId: "B-1738983123-Z7X"
}

Response:
{
  badgeId,
  ownerEmail,
  originalOwnerEmail,
  meetingId,
  timestamp,
  prompt,
  driveURL,
  traded
}


--------------------------------------------
getUserBadges  (self or admin)
--------------------------------------------
Request:
{
  action: "getUserBadges",
  email: "student@carobotics.org"
}

Response:
{
  badges: [ ... ]
}


--------------------------------------------
getAllBadges  (admin only)
--------------------------------------------
Request:
{ action: "getAllBadges" }

Response:
{
  badges: [ ... ]
}


--------------------------------------------
transferBadge  (stub)
--------------------------------------------
Not implemented.



====================================================
E. EXCUSES
====================================================

--------------------------------------------
requestExcuse  (optional)
--------------------------------------------
Request:
{
  action: "requestExcuse",
  meetingId: "M-123",
  reason: "Family emergency"
}

Response:
{
  success: true,
  excuseId: "E-1739000001-Q5D"
}


--------------------------------------------
approveExcuse  (elevated, admin)
--------------------------------------------
Request:
{
  action: "approveExcuse",
  excuseId: "E-1739000001-Q5D",
  approve: true
}

Response:
{ success: true }


--------------------------------------------
excuseStudent  (immediate approval)
--------------------------------------------
Permissions: elevated, admin

Request:
{
  action: "excuseStudent",
  meetingId: "M-123",
  studentEmail: "x@y.org",
  reason: "Pre-approved absence"
}

Response:
{ success: true }



====================================================
F. STATS ENDPOINTS
====================================================

--------------------------------------------
getMeetingStatsPublic
--------------------------------------------
Request:
{
  action: "getMeetingStatsPublic",
  meetingId
}

Response:
{
  attendanceCount,
  onTimeCount,
  onTimePercent
}


--------------------------------------------
getMeetingStatsPrivate
--------------------------------------------
Permissions: elevated, admin

Response:
{
  attendees: [
    { email, onTime, excused, override }
  ]
}


--------------------------------------------
getUserStats
--------------------------------------------
Permissions:
- self
- elevated/admin

Request:
{ action: "getUserStats", email }

Response:
{
  currentStreak,
  longestStreak,
  totalMeetings,
  attended,
  onTime,
  badges: [badgeId...]
}


--------------------------------------------
getTeamwideStatsPublic
--------------------------------------------
Permissions: standard

Response:
{
  averageAttendance,
  averageOnTimePercent,
  totalMembers,
  activeMembers
}


--------------------------------------------
getTeamwideStatsPrivate
--------------------------------------------
Permissions: elevated, admin

Response:
{
  overallAttendance,
  subteamBreakdown,
  streakLeaders,
  badgesAwarded,
  perMeetingStats
}


--------------------------------------------
getStreakLeaderboard
--------------------------------------------
Permissions: standard

Response:
{
  leaderboard: [
    { email, currentStreak }
  ]
}



====================================================
G. ADMIN UTILITIES
====================================================

--------------------------------------------
setUserStreaks
--------------------------------------------
Request:
{
  action: "setUserStreaks",
  email,
  currentStreak,
  longestStreak
}

Response:
{ success: true }


--------------------------------------------
recomputeBadgeCounts
--------------------------------------------
Request:
{
  action: "recomputeBadgeCounts"
}

Response:
{
  success: true,
  recalculated: true
}


--------------------------------------------
maintenanceFixData
--------------------------------------------
Scans for:
- invalid meeting IDs
- invalid badge IDs
- whitespace issues
- missing users
- orphaned badge rows
- out-of-range timestamps

Request:
{ action: "maintenanceFixData" }

Response:
{
  success: true,
  report: "...summary text..."
}