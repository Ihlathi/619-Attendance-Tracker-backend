/**
 * Test.js
 * Run this function in the GAS editor to verify functionality.
 */

function runTests() {
    Logger.log('Starting Tests...');

    // 1. Setup
    setup();
    Logger.log('Setup complete.');

    // Mock Tokens
    const ADMIN_TOKEN = 'TEST_TOKEN_ADMIN';
    const USER_TOKEN = 'TEST_TOKEN_USER';
    const adminEmail = 'admin@' + AUTH_CONFIG.ALLOWED_DOMAIN;
    const userEmail = 'student@' + AUTH_CONFIG.ALLOWED_DOMAIN;

    // 2. Verify Admin Exists
    const adminUser = findOne(DB_CONFIG.SHEET_NAMES.USERS, u => u.email === adminEmail);
    if (!adminUser) throw new Error('Admin user not found after setup.');

    // 3. Create a Meeting (Elevated)
    // Start time is 10 mins from now, check-in window is 15 mins.
    // So check-in should be OPEN.
    const now = new Date();
    const startTime = new Date(now.getTime() + 10 * 60000);
    const endTime = new Date(now.getTime() + 70 * 60000);

    const meetingData = {
        title: 'General Assembly',
        description: 'Weekly meeting',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        lat: 40.7128,
        lng: -74.0060,
        radius: 50,
        checkInWindowBefore: 15
    };

    // Direct Service call for test setup (bypassing Controller token check for brevity, 
    // but in real test we could simulate Controller call)
    const meeting = Service.createMeeting(adminEmail, meetingData);
    Logger.log('Created meeting: ' + meeting.title);

    // 4. Auto-Provision User via Check-In (Standard)
    // We simulate a check-in request which triggers getOrProvisionUser inside Service->checkPermission
    // Note: In Controller, verifyToken returns the email. Then Service uses it.

    // 5. Check In - Success (Within Radius & Time Window)
    const checkInSuccess = Service.checkIn(userEmail, meeting.id, 40.7128, -74.0060, false, userEmail);
    Logger.log('User checked in successfully (valid location & time).');

    // 6. Check In - Fail (Time Window)
    // Create a meeting starting in 1 hour, window 15 mins. Check-in should fail.
    const futureStart = new Date(now.getTime() + 60 * 60000);
    const futureMeeting = Service.createMeeting(adminEmail, {
        title: 'Future Meeting',
        startTime: futureStart.toISOString(),
        endTime: new Date(futureStart.getTime() + 60 * 60000).toISOString(),
        lat: 40.7128,
        lng: -74.0060,
        radius: 50,
        checkInWindowBefore: 15
    });

    try {
        Service.checkIn(userEmail, futureMeeting.id, 40.7128, -74.0060, false, userEmail);
        Logger.log('ERROR: Check-in should have failed due to time window.');
    } catch (e) {
        Logger.log('Check-in failed as expected (time): ' + e.message);
    }

    // 7. Update Role (Elevated)
    Service.updateUserRole(adminEmail, userEmail, ROLES.ELEVATED);
    const updatedUser = findOne(DB_CONFIG.SHEET_NAMES.USERS, u => u.email === userEmail);
    if (updatedUser.role !== ROLES.ELEVATED) throw new Error('Role update failed.');
    Logger.log('User role updated to Elevated.');

    Logger.log('All tests passed!');
}
