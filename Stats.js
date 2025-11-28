/**
 * Stats.js
 * Handles statistics calculation.
 */

const Stats = {
    getMeetingStatsPublic: function (meetingId) {
        const checkIns = readAll(DB_CONFIG.SHEET_NAMES.CHECKINS).filter(c => c.meetingId === meetingId);
        const total = checkIns.length;
        const onTime = checkIns.filter(c => c.wasOnTime === true || c.wasOnTime === 'true').length;

        return {
            attendanceCount: total,
            onTimeCount: onTime,
            onTimePercent: total > 0 ? (onTime / total) * 100 : 0
        };
    },

    getMeetingStatsPrivate: function (meetingId) {
        const checkIns = readAll(DB_CONFIG.SHEET_NAMES.CHECKINS).filter(c => c.meetingId === meetingId);

        return {
            attendees: checkIns.map(c => ({
                email: c.userEmail,
                onTime: c.wasOnTime,
                excused: c.excused,
                override: c.override
            }))
        };
    },

    getUserStats: function (email) {
        const user = findOne(DB_CONFIG.SHEET_NAMES.USERS, u => u.email === email);
        if (!user) throw new Error('User not found');

        const checkIns = readAll(DB_CONFIG.SHEET_NAMES.CHECKINS).filter(c => c.userEmail === email);
        const totalMeetings = readAll(DB_CONFIG.SHEET_NAMES.MEETINGS).filter(m => m.status !== MEETING_STATUS.CANCELLED && new Date(m.endTime) < new Date()).length;

        const attended = checkIns.length;
        const onTime = checkIns.filter(c => c.wasOnTime === true || c.wasOnTime === 'true').length;

        const badges = Badges.getUserBadges(email).map(b => b.badgeId);

        return {
            currentStreak: user.currentStreak || 0,
            longestStreak: user.longestStreak || 0,
            totalMeetings: totalMeetings, // Approximate, ideally should filter by user eligibility
            attended: attended,
            onTime: onTime,
            badges: badges
        };
    },

    getTeamwideStatsPublic: function () {
        const checkIns = readAll(DB_CONFIG.SHEET_NAMES.CHECKINS);
        const meetings = readAll(DB_CONFIG.SHEET_NAMES.MEETINGS).filter(m => m.status !== MEETING_STATUS.CANCELLED && new Date(m.endTime) < new Date());
        const users = readAll(DB_CONFIG.SHEET_NAMES.USERS);

        if (meetings.length === 0) return { averageAttendance: 0, averageOnTimePercent: 0, totalMembers: users.length, activeMembers: 0 };

        const avgAttendance = checkIns.length / meetings.length;
        const onTimeCount = checkIns.filter(c => c.wasOnTime === true || c.wasOnTime === 'true').length;
        const avgOnTime = checkIns.length > 0 ? (onTimeCount / checkIns.length) * 100 : 0;

        // Active members: attended at least 1 meeting
        const activeMembers = new Set(checkIns.map(c => c.userEmail)).size;

        return {
            averageAttendance: avgAttendance,
            averageOnTimePercent: avgOnTime,
            totalMembers: users.length,
            activeMembers: activeMembers
        };
    },

    getTeamwideStatsPrivate: function () {
        const publicStats = this.getTeamwideStatsPublic();
        const users = readAll(DB_CONFIG.SHEET_NAMES.USERS);

        // Subteam breakdown
        const subteamBreakdown = {};
        users.forEach(u => {
            if (u.subteams) {
                const teams = u.subteams.split(',').map(s => s.trim());
                teams.forEach(t => {
                    subteamBreakdown[t] = (subteamBreakdown[t] || 0) + 1;
                });
            }
        });

        // Streak leaders
        const streakLeaders = users
            .map(u => ({ email: u.email, currentStreak: parseInt(u.currentStreak || 0) }))
            .sort((a, b) => b.currentStreak - a.currentStreak)
            .slice(0, 10);

        return {
            overallAttendance: publicStats.averageAttendance,
            subteamBreakdown: subteamBreakdown,
            streakLeaders: streakLeaders,
            // badgesAwarded: ... (could calculate)
        };
    },

    getStreakLeaderboard: function () {
        const users = readAll(DB_CONFIG.SHEET_NAMES.USERS);
        return {
            leaderboard: users
                .map(u => ({ email: u.email, currentStreak: parseInt(u.currentStreak || 0) }))
                .sort((a, b) => b.currentStreak - a.currentStreak)
                .slice(0, 20)
        };
    },

    setUserStreaks: function (email, current, longest) {
        updateRow(DB_CONFIG.SHEET_NAMES.USERS, email, {
            currentStreak: current,
            longestStreak: longest
        }, 'email');
    },

    recomputeBadgeCounts: function () {
        // Placeholder for potentially expensive operation
        return { success: true, recalculated: true };
    }
};
