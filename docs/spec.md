===========================================================
 FRC ATTENDANCE SYSTEM – IMPLEMENTATION-READY BACKEND SPEC
===========================================================

===========================================================
1. ARCHITECTURE SUMMARY
===========================================================

Sheets:
  UsersSheet
  MeetingsSheet
  CheckinsSheet
  BadgesSheet
  ExcusesSheet
  MetadataSheet (optional, e.g. counters)

Drive:
  /badges/
      <badgeId>.png   (or jpeg)

Backend Mechanisms:
  - All requests go to doPost(e)
  - Each handler returns JSON
  - Badge generation MUST NOT block check-in

===========================================================
2. PRIMARY CHANGE: BADGE GENERATION DECOUPLING
===========================================================

Check-in MUST succeed even if badge generation fails.

checkIn() now performs:

  1. Verify meeting exists + currently check-in eligible.
  2. Validate location inside radius.
  3. Write check-in record to CheckinsSheet.
  4. Increment streaks / stats.
  5. CALL generateBadgeRequest() (non-blocking):
        - Create badge entry in BadgesSheet with:
            badgeId
            ownerEmail
            originalOwnerEmail = ownerEmail
            meetingId
            timestamp = now
            prompt = ""
            driveURL = ""
            status = "pending"
        - Trigger asynchronous badge generator:
            Method A: Use ScriptApp.newTrigger(...).create()
            Method B: Use a time-based queue worker
  6. Return:
        { success: true, pendingBadgeId }

Badge generation function will later:
  - Read badge row with status="pending"
  - Generate image prompt → call image generator
  - Upload to Drive folder
  - Update driveURL
  - Set status="ready"

If generation fails:
  - Set status="error"
  - Never breaks check-in.

Front-end retrieves badge later via:
  - getBadge(badgeId)
  - or getUserBadges(email) and filter newest.


===========================================================
3. ID FORMATS
===========================================================

meetingId = "M-" + unixTimestamp + "-" + base36(3)
badgeId   = "B-" + unixTimestamp + "-" + base36(3)
excuseId  = "E-" + unixTimestamp + "-" + base36(3)

Users are identified by email.


===========================================================
4. CORE DATA MODELS
===========================================================

UsersSheet:
  email
  displayName
  role
  subteams (CSV)
  position
  createdAt
  currentStreak
  longestStreak

MeetingsSheet:
  meetingId
  title
  description
  startTime
  endTime
  lat
  lng
  radius
  checkInWindowBefore
  checkInWindowAfter
  createdAt
  lastEdited

CheckinsSheet:
  meetingId
  email
  timestamp
  wasOnTime
  override (bool)
  excused (bool)

BadgesSheet:
  badgeId
  ownerEmail
  originalOwnerEmail
  meetingId
  timestamp
  prompt
  driveURL
  status: "pending" | "ready" | "error"

ExcusesSheet:
  excuseId
  meetingId
  email
  reason
  timestamp
  approved: true | false | null


===========================================================
5. ENDPOINT LOGIC (IMPLEMENTATION DETAILS)
===========================================================


-----------------------------------------------------------
checkIn
-----------------------------------------------------------
Inputs:
  meetingId
  lat
  lng
  manualOverride (bool)
  overrideEmail (nullable)

Process:
  - Determine actingUser from token.
  - Determine targetUser = overrideEmail || actingUser.
  - Validate location radius OR allow override if elevated/admin.
  - Validate check-in window.
  - If already checked in → return {success:false, reason:"already-checked-in"}

Write check-in row:
  meetingId, targetUser, timestamp=now, wasOnTime, override, excused=false

Update streaks in UsersSheet.

Generate pending badge request:
  badgeId = generateBadgeId()
  Write to BadgesSheet:
    badgeId, ownerEmail=targetUser, originalOwnerEmail=targetUser,
    meetingId, timestamp=now, prompt="", driveURL="", status="pending"

Trigger asynchronous badge job:
  ScriptApp.newTrigger("processPendingBadges").timeBased().everyMinutes(1).create()
  OR manually call if queue empty.

Return:
{
  success: true,
  pendingBadgeId: badgeId
}


-----------------------------------------------------------
processPendingBadges  (async worker)
-----------------------------------------------------------
- Query BadgesSheet for 1–3 rows with status="pending"
- For each:
    - Construct prompt:
        Use meeting title, description, date, etc.
    - Generate image (external API OR local model)
    - Upload to Drive:
        Folder: /badges/
        File:  <badgeId>.png
    - Update row:
        prompt = usedPrompt
        driveURL = Drive file URL
        status = "ready"

- If errors:
    status="error"


-----------------------------------------------------------
getBadge
(admin or owner)
-----------------------------------------------------------
Return badge row exactly.


-----------------------------------------------------------
getUserBadges
(self or admin)
-----------------------------------------------------------
Return all badge rows where ownerEmail = provided email.
Front-end can sort by timestamp.


-----------------------------------------------------------
getLatestBadgeAfterCheckIn (frontend logic)
-----------------------------------------------------------
After check-in:
  - call getBadge(pendingBadgeId) in a loop
  - when status == "ready", display it.


===========================================================
6. HOW TO LOOK UP A USER’S BADGE FOR A SPECIFIC MEETING
===========================================================

Query:
  SELECT * FROM BadgesSheet WHERE
    ownerEmail = userEmail AND meetingId = X

If none found → either:
  - meeting didn’t award a badge (rare)
  - or badge still pending (check status)


===========================================================
7. GOOGLE DRIVE FILE STORAGE RULES
===========================================================

Folder: `/badges/`
Files:
  <badgeId>.png

Permissions:
  - File must be set to “Anyone with link” OR deliver via Apps Script `doGet`.

Spreadsheet stores:
  - driveURL = DriveApp.getFileById(fileId).getDownloadUrl()
    (or webContentLink)

Badge generation function CANNOT block frontend.


===========================================================
8. FULL ENDPOINT LIST FOR IMPLEMENTATION
===========================================================

User Management:
  setUserRole
  setUserSubteams
  setUserPosition
  editUserMeta

Meetings:
  createMeeting
  editMeeting
  deleteMeeting
  getUpcomingMeetings

Check-in:
  checkIn   (returns pendingBadgeId)
  processPendingBadges (async)

Badges:
  getBadge
  getUserBadges
  getAllBadges (admin)
  transferBadge (stub)

Excuses:
  requestExcuse
  approveExcuse
  excuseStudent

Stats:
  getMeetingStatsPublic
  getMeetingStatsPrivate
  getUserStats
  getTeamwideStatsPublic
  getTeamwideStatsPrivate
  getStreakLeaderboard

Admin Utilities:
  setUserStreaks
  recomputeBadgeCounts
  maintenanceFixData


===========================================================
9. KEY SAFETY RULES (BACKEND)
===========================================================

- checkIn MUST NEVER FAIL because badge system is down.
- Badge generator must be idempotent.
- All cross-sheet lookups must use email as key.
- Meeting ID uniqueness enforced on creation.
- Badge ID uniqueness enforced by timestamp + random.
- Badge generator should retry up to 3 times on failure.
- All timestamps should be ISO UTC.
- Badge generation uses the pollinations API as outlined in the pollinationsAPI.json file.


===========================================================
 END OF SPEC
===========================================================