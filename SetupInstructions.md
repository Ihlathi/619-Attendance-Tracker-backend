# Setup Instructions

## 1. Create a Google Sheet
1.  Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
2.  Name it "Attendance Tracker Backend".

## 2. Open Script Editor
1.  In the spreadsheet, go to **Extensions > Apps Script**.
2.  This will open the Google Apps Script editor in a new tab.

## 3. Copy Code Files
Create the following files in the script editor and copy the content from the provided local files:

| Local File | GAS File | Description |
| :--- | :--- | :--- |
| `Code.js` | `Code.gs` | Main entry point |
| `Controller.js` | `Controller.gs` | Request handling |
| `Service.js` | `Service.gs` | Business logic (Geo, Auth) |
| `Database.js` | `Database.gs` | Sheet operations |
| `Auth.js` | `Auth.gs` | Permissions & Token Verification |
| `Models.js` | `Models.gs` | Schema definitions |
| `Setup.js` | `Setup.gs` | Initialization script |
| `Test.js` | `Test.gs` | Verification script |

> [!NOTE]
> In Google Apps Script, files have the `.gs` extension. You can name them whatever you want, but keeping the names consistent helps.

## 4. Run Setup
1.  In the editor toolbar, select the `setup` function from the dropdown.
2.  Click **Run**.
3.  Grant the necessary permissions when prompted.
4.  This will create the required sheets (`Users`, `Meetings`, `CheckIns`) and an initial admin user (`admin@carobotics.org`).

## 5. Verify
1.  Select the `runTests` function.
2.  Click **Run**.
3.  Check the **Execution Log** to see if all tests passed.

## 6. Deploy as Web App
1.  Click **Deploy > New deployment**.
2.  Select type: **Web app**.
3.  Description: "Attendance API v3".
4.  Execute as: **Me** (your account).
5.  Who has access: **Anyone** (or "Anyone with Google account" if you want to restrict it, but "Anyone" is easiest for external apps).
6.  Click **Deploy**.
7.  Copy the **Web App URL**. This is your API endpoint.

## API Usage
Send POST requests to the Web App URL with a JSON body. **All requests must include a valid Google ID Token.**

**Example Payload (Check In):**
```json
{
  "action": "checkIn",
  "token": "eyJhbGciOiJSUzI1NiIs...",
  "meetingId": "m_12345",
  "lat": 40.7128,
  "lng": -74.0060
}
```

**Example Payload (Create Meeting - Elevated Only):**
```json
{
  "action": "createMeeting",
  "token": "eyJhbGciOiJSUzI1NiIs...",
  "title": "Build Season Kickoff",
  "startTime": "2023-10-01T09:00:00Z",
  "endTime": "2023-10-01T12:00:00Z",
  "lat": 40.7128,
  "lng": -74.0060,
  "radius": 100,
  "checkInWindowBefore": 15
}
```
