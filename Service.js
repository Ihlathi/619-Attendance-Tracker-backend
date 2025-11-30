/**
 * Service.js
 * Business logic for the attendance system.
 */

const Service = {
    // ====================================================
    // A. USER MANAGEMENT
    // ====================================================

    setUserRole: function (requestorEmail, targetEmail, newRole) {
        if (!checkPermission(requestorEmail, ROLES.ADMIN)) {
            throw new Error('Permission denied: Only admins can update roles.');
        }
        if (!Object.values(ROLES).includes(newRole)) throw new Error('Invalid role');

        updateRow(DB_CONFIG.SHEET_NAMES.USERS, targetEmail, { role: newRole }, 'email');
        return { success: true };
    },

    setUserSubteams: function (requestorEmail, targetEmail, subteams) {
        // Elevated can update subteams? Spec says "elevated, admin"
        if (!checkPermission(requestorEmail, ROLES.ELEVATED)) {
            throw new Error('Permission denied.');
        }

        // Validate subteams
        if (!Array.isArray(subteams)) throw new Error('Subteams must be an array');
        // Optional: validate against SUBTEAMS constant

        updateRow(DB_CONFIG.SHEET_NAMES.USERS, targetEmail, { subteams: subteams.join(',') }, 'email');
        return { success: true };
    },

    setUserPosition: function (requestorEmail, targetEmail, position) {
        if (!checkPermission(requestorEmail, ROLES.ELEVATED)) {
            throw new Error('Permission denied.');
        }
        if (!Object.values(POSITIONS).includes(position)) throw new Error('Invalid position');

        updateRow(DB_CONFIG.SHEET_NAMES.USERS, targetEmail, { position: position }, 'email');
        return { success: true };
    },

    getAllUsers: function (requestorEmail) {
        if (!checkPermission(requestorEmail, ROLES.ELEVATED)) {
            throw new Error('Permission denied: Elevated or Admin role required.');
        }
        return { users: readAll(DB_CONFIG.SHEET_NAMES.USERS) };
    },

    // ====================================================
    // B. MEETING MANAGEMENT
    // ====================================================

    createMeeting: function (requestorEmail, meetingData) {
        if (!checkPermission(requestorEmail, ROLES.ELEVATED)) {
            throw new Error('Permission denied.');
        }

        const meetings = [];
        const baseId = Math.floor(new Date(meetingData.startTime).getTime() / 1000); // If you're wondering why two meetings have the same ID and it's breaking everything, you got really lucky. Congratulations. (0.002% or 300x more unlikely than getting a 5* on a random pull in genshin)

        // Handle recurring
        const count = (meetingData.recurring && meetingData.recurring.enabled) ? meetingData.recurring.count : 1;

        for (let i = 0; i < count; i++) {
            const m = { ...meetingData };
            // Adjust dates for recursion (simplified: assuming weekly)
            if (i > 0) {
                const start = new Date(m.startTime);
                const end = new Date(m.endTime);
                start.setDate(start.getDate() + (7 * i));
                end.setDate(end.getDate() + (7 * i));
                m.startTime = start.toISOString();
                m.endTime = end.toISOString();
            }

            m.id = 'M-' + Math.floor(new Date(m.startTime).getTime() / 1000) + '-' + generateBase36(3);
            m.createdAt = new Date().toISOString();
            m.status = MEETING_STATUS.SCHEDULED;
            m.checkInWindowBefore = m.checkInWindowBefore || 15;
            m.checkInWindowAfter = m.checkInWindowAfter || 5;

            // Remove recurring object from DB row
            delete m.recurring;
            delete m.action;
            delete m.token;

            createRow(DB_CONFIG.SHEET_NAMES.MEETINGS, m);
            meetings.push(m.id);
        }

        return { success: true, meetingIds: meetings };
    },

    editMeeting: function (requestorEmail, meetingId, updates) {
        const meeting = findOne(DB_CONFIG.SHEET_NAMES.MEETINGS, m => m.id === meetingId);
        if (!meeting) throw new Error('Meeting not found');

        const hasStarted = new Date(meeting.startTime) < new Date();

        // If started, Admin only. Else Elevated.
        if (hasStarted) {
            if (!checkPermission(requestorEmail, ROLES.ADMIN))
                throw new Error('Permission denied: Meeting started, Admin only.');
        } else {
            if (!checkPermission(requestorEmail, ROLES.ELEVATED))
                throw new Error('Permission denied.');
        }

        updates.lastEdited = new Date().toISOString();
        updateRow(DB_CONFIG.SHEET_NAMES.MEETINGS, meetingId, updates);
        return { success: true };
    },

    deleteMeeting: function (requestorEmail, meetingId) {
        const meeting = findOne(DB_CONFIG.SHEET_NAMES.MEETINGS, m => m.id === meetingId);
        if (!meeting) throw new Error('Meeting not found');

        const hasStarted = new Date(meeting.startTime) < new Date();

        if (hasStarted) {
            if (!checkPermission(requestorEmail, ROLES.ADMIN))
                throw new Error('Permission denied: Meeting started/past, Admin only.');
        } else {
            if (!checkPermission(requestorEmail, ROLES.ELEVATED))
                throw new Error('Permission denied.');
        }

        deleteRow(DB_CONFIG.SHEET_NAMES.MEETINGS, meetingId);
        return { success: true };
    },

    getUpcomingMeetings: function (requestorEmail, numberOfMeetings) {
        // Returns active and future meetings
        const all = readAll(DB_CONFIG.SHEET_NAMES.MEETINGS);
        const now = new Date();

        // Filter: Status not cancelled/archived AND (EndTime > Now), return numberOfMeetings requested

        const meetings = all.filter(m => {
            if (m.status === MEETING_STATUS.CANCELLED || m.status === MEETING_STATUS.ARCHIVED) return false;
            return new Date(m.endTime) > now;
        }).slice(0, numberOfMeetings); // Return only numberOfMeetings

        return { meetings: meetings };
    },

    // ====================================================
    // C. CHECK-IN
    // ====================================================

    checkIn: function (requestorEmail, meetingId, lat, lng, manualOverride, overrideEmail) {
        const targetEmail = (manualOverride && overrideEmail) ? overrideEmail : requestorEmail;
        const actingUser = requestorEmail;

        // Permissions
        if (manualOverride) {
            if (!checkPermission(actingUser, ROLES.ELEVATED)) throw new Error('Permission denied: Manual override requires elevated role.');
        } else {
            if (targetEmail !== actingUser) throw new Error('Permission denied: Cannot check in others without override.');
        }

        const meeting = findOne(DB_CONFIG.SHEET_NAMES.MEETINGS, m => m.id === meetingId);
        if (!meeting) throw new Error('Meeting not found');

        // Check if already checked in
        const existing = findOne(DB_CONFIG.SHEET_NAMES.CHECKINS, c => c.meetingId === meetingId && c.userEmail === targetEmail);
        if (existing) return { success: false, reason: 'already-checked-in' };

        let wasOnTime = true;

        if (!manualOverride) {
            // Validate Time
            const now = new Date();
            const start = new Date(meeting.startTime);
            const end = new Date(meeting.endTime);
            const windowBefore = meeting.checkInWindowBefore || 15;
            const windowAfter = meeting.checkInWindowAfter || 5;

            const checkInStart = new Date(start.getTime() - (windowBefore * 60000));
            const checkInEnd = new Date(start.getTime() + (windowAfter * 60000));

            if (now < checkInStart) throw new Error('Check-in not yet open.');
            if (now > end) throw new Error('Meeting has ended.');

            // Determine OnTime
            if (now > checkInEnd) wasOnTime = false;

            // Validate Location
            const distance = getDistanceFromLatLonInMeters(lat, lng, meeting.lat, meeting.lng);
            if (distance > meeting.radius) throw new Error('Location validation failed. Too far.');
        }

        // Record Check-in
        const checkInData = {
            id: 'C-' + Math.floor(Date.now() / 1000) + '-' + generateBase36(3),
            meetingId: meetingId,
            userEmail: targetEmail,
            timestamp: new Date().toISOString(),
            lat: lat || '',
            lng: lng || '',
            status: manualOverride ? 'manual_override' : 'valid',
            wasOnTime: wasOnTime,
            override: !!manualOverride,
            excused: false
        };
        createRow(DB_CONFIG.SHEET_NAMES.CHECKINS, checkInData);

        // Update Streaks (Simplified logic) TODO: Allow streaks to be reset on missing non-excused meetings
        const user = getOrProvisionUser(targetEmail);
        let currentStreak = parseInt(user.currentStreak || 0) + 1;
        let longestStreak = parseInt(user.longestStreak || 0);
        if (currentStreak > longestStreak) longestStreak = currentStreak;

        updateRow(DB_CONFIG.SHEET_NAMES.USERS, targetEmail, {
            currentStreak: currentStreak,
            longestStreak: longestStreak
        }, 'email');

        // Generate Badge Request
        const badgeId = Badges.createBadgeRequest(targetEmail, meetingId);

        return {
            success: true,
            wasOnTime: wasOnTime,
            pendingBadgeId: badgeId
        };
    },

    // ====================================================
    // E. EXCUSES
    // ====================================================

    requestExcuse: function (requestorEmail, meetingId, reason) {
        const excuseId = 'E-' + Math.floor(Date.now() / 1000) + '-' + generateBase36(3);
        const data = {
            excuseId: excuseId,
            meetingId: meetingId,
            email: requestorEmail,
            reason: reason,
            timestamp: new Date().toISOString(),
            approved: 'pending'
        };
        createRow(DB_CONFIG.SHEET_NAMES.EXCUSES, data);
        return { success: true, excuseId: excuseId };
    },

    approveExcuse: function (requestorEmail, excuseId, approve) {
        if (!checkPermission(requestorEmail, ROLES.ELEVATED)) throw new Error('Permission denied.');

        updateRow(DB_CONFIG.SHEET_NAMES.EXCUSES, excuseId, { approved: approve }, 'excuseId');
        return { success: true };
    },

    excuseStudent: function (requestorEmail, meetingId, studentEmail, reason) {
        if (!checkPermission(requestorEmail, ROLES.ELEVATED)) throw new Error('Permission denied.');

        // Create approved excuse
        const excuseId = 'E-' + Math.floor(Date.now() / 1000) + '-' + generateBase36(3);
        const data = {
            excuseId: excuseId,
            meetingId: meetingId,
            email: studentEmail,
            reason: reason,
            timestamp: new Date().toISOString(),
            approved: true
        };
        createRow(DB_CONFIG.SHEET_NAMES.EXCUSES, data);

        const checkInData = {
            id: 'C-' + Math.floor(Date.now() / 1000) + '-' + generateBase36(3),
            meetingId: meetingId,
            userEmail: studentEmail,
            timestamp: new Date().toISOString(),
            lat: '',
            lng: '',
            status: 'valid',
            wasOnTime: true,
            override: true,
            excused: true
        };
        createRow(DB_CONFIG.SHEET_NAMES.CHECKINS, checkInData);

        return { success: true };
    }
};

// Helper for distance (kept from original)
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    var R = 6371e3;
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
