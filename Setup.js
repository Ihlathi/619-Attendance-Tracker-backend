/**
 * Setup.js
 * One-time setup script to initialize the spreadsheet.
 */

function setup() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Create sheets if they don't exist
    Object.keys(DB_CONFIG.SHEET_NAMES).forEach(key => {
        const sheetName = DB_CONFIG.SHEET_NAMES[key];
        let sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
            sheet = ss.insertSheet(sheetName);
            // Add headers
            const headers = SCHEMA[key];
            if (headers) {
                sheet.appendRow(headers);
            }
        }
    });

    // Create an initial Admin user if Users sheet is empty (except header)
    const usersSheet = ss.getSheetByName(DB_CONFIG.SHEET_NAMES.USERS);
    if (usersSheet.getLastRow() <= 1) {
        const adminEmail = 'admin@' + AUTH_CONFIG.ALLOWED_DOMAIN;
        const adminUser = {
            email: adminEmail,
            role: ROLES.ELEVATED,
            name: 'System Admin',
            createdAt: new Date().toISOString()
        };
        createRow(DB_CONFIG.SHEET_NAMES.USERS, adminUser);
        Logger.log('Created initial admin user: ' + adminEmail);
    }
}
