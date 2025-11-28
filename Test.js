/**
 * Test.js
 * Run these functions in the GAS editor to verify functionality.
 */

function testSetup() {
    setup();
    Logger.log('Setup complete.');
}

function testCreateMeeting() {
    const adminEmail = 'admin@' + AUTH_CONFIG.ALLOWED_DOMAIN;
    const meetingData = {
        title: 'Test Meeting',
        description: 'Testing 123',
        startTime: new Date(new Date().getTime() + 3600000).toISOString(), // 1 hour from now
        endTime: new Date(new Date().getTime() + 7200000).toISOString(),   // 2 hours from now
        lat: 40.7128,
        lng: -74.0060,
        radius: 100,
        checkInWindowBefore: 60
    };

    // Mock permission check by ensuring admin exists
    const result = Service.createMeeting(adminEmail, meetingData);
    Logger.log('Create Meeting Result: ' + JSON.stringify(result));
    return result.meetingIds[0];
}

function testCheckIn() {
    const meetingId = testCreateMeeting(); // Create a fresh meeting
    const userEmail = 'student@' + AUTH_CONFIG.ALLOWED_DOMAIN;

    // Mock user existence
    getOrProvisionUser(userEmail);

    // Simulate Check-in
    // Note: We need to be within radius.
    const lat = 40.7128;
    const lng = -74.0060;

    const result = Service.checkIn(userEmail, meetingId, lat, lng);
    Logger.log('Check-in Result: ' + JSON.stringify(result));

    if (result.success) {
        Logger.log('Pending Badge ID: ' + result.pendingBadgeId);
    }
}

function testBadgeGeneration() {
    // Manually trigger badge processing
    Logger.log('Processing pending badges...');
    // Create multiple dummy requests to test parallel processing
    const email = 'student@' + AUTH_CONFIG.ALLOWED_DOMAIN;
    Badges.createBadgeRequest(email, 'M-TEST-1');
    Badges.createBadgeRequest(email, 'M-TEST-2');
    Badges.createBadgeRequest(email, 'M-TEST-3');

    Badges.processPendingBadges();
    Logger.log('Done. Check Drive folder for 3 new images.');
}

function testStats() {
    const adminEmail = 'admin@' + AUTH_CONFIG.ALLOWED_DOMAIN;
    const stats = Stats.getTeamwideStatsPublic();
    Logger.log('Team Stats: ' + JSON.stringify(stats));
}
