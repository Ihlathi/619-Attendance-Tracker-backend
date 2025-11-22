/**
 * Auth.js
 * Handles permission checks and domain validation.
 */

const AUTH_CONFIG = {
    ALLOWED_DOMAIN: 'carobotics.org'
};

/**
 * Verifies a Google ID Token.
 * Returns the user's email if valid and allowed domain.
 * Throws error if invalid.
 */
function verifyToken(token) {
    if (!token) throw new Error('No token provided.');

    // For testing purposes, allow a magic token
    if (token === 'TEST_TOKEN_ADMIN') return 'admin@' + AUTH_CONFIG.ALLOWED_DOMAIN;
    if (token === 'TEST_TOKEN_USER') return 'student@' + AUTH_CONFIG.ALLOWED_DOMAIN;

    try {
        const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + token;
        const response = UrlFetchApp.fetch(url);
        const payload = JSON.parse(response.getContentText());

        if (payload.error) {
            throw new Error('Invalid token: ' + payload.error_description);
        }

        const email = payload.email;
        if (!isValidDomain(email)) {
            throw new Error('Invalid domain: ' + email);
        }

        return email;
    } catch (e) {
        throw new Error('Token verification failed: ' + e.message);
    }
}

/**
 * Validates if the email belongs to the allowed domain.
 */
function isValidDomain(email) {
    return email && email.endsWith('@' + AUTH_CONFIG.ALLOWED_DOMAIN);
}

/**
 * Gets the user from the DB.
 * If user does not exist but has valid domain, AUTO-CREATES them as STANDARD.
 */
function getOrProvisionUser(email) {
    if (!isValidDomain(email)) throw new Error('Invalid domain.');

    let user = findOne(DB_CONFIG.SHEET_NAMES.USERS, u => u.email === email);

    if (!user) {
        // Auto-provision
        user = {
            email: email,
            role: ROLES.STANDARD,
            name: email.split('@')[0], // Default name
            createdAt: new Date().toISOString()
        };
        createRow(DB_CONFIG.SHEET_NAMES.USERS, user);
        Logger.log('Auto-provisioned user: ' + email);
    }

    return user;
}

/**
 * Verifies if a user has the required role.
 * @param {string} userEmail - The email of the user making the request.
 * @param {string} requiredRole - The minimum role required.
 */
function checkPermission(userEmail, requiredRole) {
    const user = getOrProvisionUser(userEmail);
    const userRole = user.role;

    if (userRole === ROLES.ELEVATED) return true; // Elevated can do anything

    // If required role is STANDARD, both Elevated and Standard pass
    if (requiredRole === ROLES.STANDARD && (userRole === ROLES.ELEVATED || userRole === ROLES.STANDARD)) return true;

    return false;
}
