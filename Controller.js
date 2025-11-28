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
            case 'updateUserRole':
                result = Service.updateUserRole(requestorEmail, payload.targetEmail, payload.newRole);
                break;
            case 'createMeeting':
                result = Service.createMeeting(requestorEmail, payload);
                break;
            case 'checkIn':
                // payload: { meetingId, lat, lng, manualOverride, userEmail (for override) }
                // If manualOverride, userEmail is the target. If not, userEmail is requestorEmail.
                const targetEmail = payload.manualOverride ? payload.userEmail : requestorEmail;

                result = Service.checkIn(
                    targetEmail,
                    payload.meetingId,
                    payload.lat,
                    payload.lng,
                    payload.manualOverride,
                    requestorEmail
                );
                break;
            case 'getUpcomingMeetings':
                result = Service.getUpcomingMeetings(requestorEmail);
                break;
            case 'getMeetingStats':
                result = Service.getMeetingStats(requestorEmail, payload.meetingId);
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
