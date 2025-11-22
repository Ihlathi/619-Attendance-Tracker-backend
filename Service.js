/**
 * Service.js
 * Business logic for the attendance system.
 */

const Service = {
    /**
     * Updates a user's role.
     */
    updateUserRole: function (requestorEmail, targetEmail, newRole) {
        if (!checkPermission(requestorEmail, ROLES.ELEVATED)) {
            throw new Error('Permission denied: Only elevated users can update roles.');
        }

        if (![ROLES.ELEVATED, ROLES.STANDARD].includes(newRole)) {
            throw new Error('Invalid role: ' + newRole);
        }

        // Ensure target user exists (or provision them)
        const user = getOrProvisionUser(targetEmail);

        // Update role
        updateRow(DB_CONFIG.SHEET_NAMES.USERS, user.email, { role: newRole }, 'email');
        return { email: user.email, role: newRole };
    },

    /**
     * Creates a new meeting.
     */
    createMeeting: function (requestorEmail, meetingData) {
        if (!checkPermission(requestorEmail, ROLES.ELEVATED)) {
            throw new Error('Permission denied: Only elevated users can create meetings.');
        }

        meetingData.id = 'm_' + new Date().getTime();
        meetingData.createdAt = new Date().toISOString();
        meetingData.status = MEETING_STATUS.SCHEDULED;

        // Default checkInWindowBefore to 15 minutes if not provided
        if (meetingData.checkInWindowBefore === undefined || meetingData.checkInWindowBefore === null) {
            meetingData.checkInWindowBefore = 15;
        }

        // Ensure lat/lng/radius are present
        if (!meetingData.lat || !meetingData.lng || !meetingData.radius) {
            throw new Error('Meeting must have lat, lng, and radius.');
        }

        return createRow(DB_CONFIG.SHEET_NAMES.MEETINGS, meetingData);
    },

    /**
     * Checks a user into a meeting.
     */
    checkIn: function (userEmail, meetingId, lat, lng, isManualOverride = false, requestorEmail = null) {
        // If manual override, requestor must be elevated
        if (isManualOverride) {
            if (!checkPermission(requestorEmail, ROLES.ELEVATED)) {
                throw new Error('Permission denied: Only elevated users can perform manual overrides.');
            }
        } else {
            // Standard check-in: userEmail must match requestorEmail (verified by token in Controller)
            if (userEmail !== requestorEmail) {
                throw new Error('Permission denied: You can only check yourself in.');
            }
            if (!checkPermission(userEmail, ROLES.STANDARD)) {
                throw new Error('Permission denied: User not authorized.');
            }
        }

        const meeting = findOne(DB_CONFIG.SHEET_NAMES.MEETINGS, m => m.id === meetingId);
        if (!meeting) throw new Error('Meeting not found.');

        if (meeting.status !== MEETING_STATUS.SCHEDULED) {
            throw new Error('Meeting is not active (Status: ' + meeting.status + ')');
        }

        // Check if already checked in
        const existingCheckIn = findOne(DB_CONFIG.SHEET_NAMES.CHECKINS, c => c.meetingId === meetingId && c.userEmail === userEmail);
        if (existingCheckIn) {
            return existingCheckIn; // Idempotent success
        }

        // Validate Time (unless manual override)
        if (!isManualOverride) {
            const now = new Date();
            const start = new Date(meeting.startTime);
            const end = new Date(meeting.endTime);
            const windowMinutes = meeting.checkInWindowBefore || 15;
            const windowStart = new Date(start.getTime() - (windowMinutes * 60000));

            if (now < windowStart) {
                throw new Error('Check-in not yet open. Opens at ' + windowStart.toISOString());
            }
            if (now > end) {
                throw new Error('Meeting has ended.');
            }
        }

        // Validate Location (unless manual override)
        if (!isManualOverride) {
            const distance = getDistanceFromLatLonInMeters(lat, lng, meeting.lat, meeting.lng);
            if (distance > meeting.radius) {
                throw new Error('Location validation failed. You are ' + Math.round(distance) + 'm away (Max: ' + meeting.radius + 'm).');
            }
        }

        const checkInData = {
            id: 'c_' + new Date().getTime(),
            userEmail: userEmail,
            meetingId: meetingId,
            timestamp: new Date().toISOString(),
            lat: lat || '',
            lng: lng || '',
            status: isManualOverride ? 'manual_override' : 'valid'
        };

        return createRow(DB_CONFIG.SHEET_NAMES.CHECKINS, checkInData);
    },

    /**
     * Get upcoming or active meetings.
     */
    getUpcomingMeetings: function (requestorEmail) {
        if (!checkPermission(requestorEmail, ROLES.STANDARD)) {
            throw new Error('Permission denied.');
        }

        const allMeetings = readAll(DB_CONFIG.SHEET_NAMES.MEETINGS);
        const now = new Date();

        return allMeetings.filter(m => {
            if (m.status !== MEETING_STATUS.SCHEDULED) return false;
            const end = new Date(m.endTime);
            return end > now; // Only show meetings that haven't ended
        });
    },

    /**
     * Get stats for a meeting.
     */
    getMeetingStats: function (requestorEmail, meetingId) {
        if (!checkPermission(requestorEmail, ROLES.ELEVATED)) {
            throw new Error('Permission denied.');
        }

        const checkIns = readAll(DB_CONFIG.SHEET_NAMES.CHECKINS);
        const count = checkIns.filter(c => c.meetingId === meetingId).length;

        return {
            meetingId: meetingId,
            attendeeCount: count
        };
    }
};

/**
 * Haversine formula to calculate distance in meters.
 */
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    var R = 6371e3; // Radius of the earth in meters
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in meters
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
