/**
 * Controller.js
 * Handles request dispatching and response formatting.
 */

function handleRequest(e) {
    try {
        if (!e.postData || !e.postData.contents) {
            throw new Error('Invalid request: JSON body required.');
        }

        const payload = JSON.parse(e.postData.contents);
        const action = payload.action;

        // Extract Token
        const token = payload.token;
        if (!token) throw new Error('Authentication token required.');

        // Verify Token and get Email
        const requestorEmail = verifyToken(token);

        let result;

        switch (action) {
            // User Management
            case 'setUserRole':
                result = Service.setUserRole(requestorEmail, payload.email, payload.role);
                break;
            case 'setUserSubteams':
                result = Service.setUserSubteams(requestorEmail, payload.email, payload.subteams);
                break;
            case 'setUserPosition':
                result = Service.setUserPosition(requestorEmail, payload.email, payload.position);
                break;
            case 'editUserMeta':
                result = Service.editUserMeta(requestorEmail, payload.email, payload.fields);
                break;

            // Meeting Management
            case 'createMeeting':
                result = Service.createMeeting(requestorEmail, payload);
                break;
            case 'editMeeting':
                result = Service.editMeeting(requestorEmail, payload.meetingId, payload.updates);
                break;
            case 'deleteMeeting':
                result = Service.deleteMeeting(requestorEmail, payload.meetingId);
                break;
            case 'getUpcomingMeetings':
                result = Service.getUpcomingMeetings(requestorEmail);
                break;

            // Check-In
            case 'checkIn':
                result = Service.checkIn(
                    requestorEmail,
                    payload.meetingId,
                    payload.lat,
                    payload.lng,
                    payload.manualOverride,
                    payload.overrideEmail
                );
                break;

            // Badges
            case 'getBadge':
                result = Badges.getBadge(payload.badgeId);
                break;
            case 'getUserBadges':
                result = { badges: Badges.getUserBadges(payload.email || requestorEmail) };
                break;
            case 'getAllBadges':
                if (!checkPermission(requestorEmail, ROLES.ADMIN)) throw new Error('Permission denied');
                result = { badges: Badges.getAllBadges() };
                break;

            // Excuses
            case 'requestExcuse':
                result = Service.requestExcuse(requestorEmail, payload.meetingId, payload.reason);
                break;
            case 'approveExcuse':
                result = Service.approveExcuse(requestorEmail, payload.excuseId, payload.approve);
                break;
            case 'excuseStudent':
                result = Service.excuseStudent(requestorEmail, payload.meetingId, payload.studentEmail, payload.reason);
                break;

            // Stats
            case 'getMeetingStatsPublic':
                result = Stats.getMeetingStatsPublic(payload.meetingId);
                break;
            case 'getMeetingStatsPrivate':
                if (!checkPermission(requestorEmail, ROLES.ELEVATED)) throw new Error('Permission denied');
                result = Stats.getMeetingStatsPrivate(payload.meetingId);
                break;
            case 'getUserStats':
                result = Stats.getUserStats(payload.email || requestorEmail);
                break;
            case 'getTeamwideStatsPublic':
                result = Stats.getTeamwideStatsPublic();
                break;
            case 'getTeamwideStatsPrivate':
                if (!checkPermission(requestorEmail, ROLES.ELEVATED)) throw new Error('Permission denied');
                result = Stats.getTeamwideStatsPrivate();
                break;
            case 'getStreakLeaderboard':
                result = Stats.getStreakLeaderboard();
                break;

            // Admin Utilities
            case 'setUserStreaks':
                if (!checkPermission(requestorEmail, ROLES.ADMIN)) throw new Error('Permission denied');
                result = Stats.setUserStreaks(payload.email, payload.currentStreak, payload.longestStreak);
                break;
            case 'recomputeBadgeCounts':
                if (!checkPermission(requestorEmail, ROLES.ADMIN)) throw new Error('Permission denied');
                result = Stats.recomputeBadgeCounts();
                break;
            case 'maintenanceFixData':
                // Not implemented yet, but good to have the switch
                throw new Error('Not implemented');
                break;

            default:
                throw new Error('Invalid action: ' + action);
        }

        return ContentService.createTextOutput(JSON.stringify({
            status: 'success',
            data: result
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            message: err.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}
