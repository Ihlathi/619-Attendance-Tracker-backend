/**
 * Models.js
 * Defines the data structure for documentation and setup.
 */

const SCHEMA = {
    USERS: ['email', 'role', 'name', 'createdAt'], // email is ID
    MEETINGS: ['id', 'title', 'description', 'startTime', 'endTime', 'lat', 'lng', 'radius', 'checkInWindowBefore', 'status', 'createdAt'],
    CHECKINS: ['id', 'meetingId', 'userEmail', 'timestamp', 'lat', 'lng', 'status'] // status: valid, manual_override
};

const ROLES = {
    ELEVATED: 'elevated', // Admin/Manager
    STANDARD: 'standard'  // Regular user
};

const MEETING_STATUS = {
    SCHEDULED: 'scheduled',
    CANCELLED: 'cancelled',
    ARCHIVED: 'archived'
};
