/**
 * Models.js
 * Defines the data structure for documentation and setup.
 */

const SCHEMA = {
    USERS: ['email', 'role', 'name', 'createdAt', 'subteams', 'position', 'currentStreak', 'longestStreak'], // email is ID
    MEETINGS: ['id', 'title', 'description', 'startTime', 'endTime', 'lat', 'lng', 'radius', 'checkInWindowBefore', 'checkInWindowAfter', 'status', 'createdAt', 'lastEdited'],
    CHECKINS: ['id', 'meetingId', 'userEmail', 'timestamp', 'lat', 'lng', 'status', 'wasOnTime', 'override', 'excused'], // status: valid, manual_override
    BADGES: ['badgeId', 'ownerEmail', 'originalOwnerEmail', 'meetingId', 'timestamp', 'prompt', 'driveURL', 'status'], // status: pending, ready, error
    EXCUSES: ['excuseId', 'meetingId', 'email', 'reason', 'timestamp', 'approved'] // approved: TRUE, FALSE, or empty (null)
};

const ROLES = {
    ADMIN: 'admin',       // System Admin
    ELEVATED: 'elevated', // Manager/Lead
    STANDARD: 'standard'  // Regular user
};

const MEETING_STATUS = {
    SCHEDULED: 'scheduled',
    CANCELLED: 'cancelled',
    ARCHIVED: 'archived'
};

const SUBTEAMS = [
    'mechanical',
    'electrical',
    'programming',
    'cad',
    'social-marketing',
    'sponsorship-fundraising',
    'spirit-awards',
    'outreach-recruitment',
    'drive'
];

const POSITIONS = {
    NONE: 'none',
    LEAD: 'lead'
};
