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
        } else {
            // Optional: Update headers if they changed?
            // For now, assume manual migration if needed, or just append new columns manually.
            // But we can check if headers match and append missing ones.
            const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
            const newHeaders = SCHEMA[key];
            newHeaders.forEach(h => {
                if (!currentHeaders.includes(h)) {
                    sheet.getRange(1, currentHeaders.length + 1).setValue(h);
                    // Update currentHeaders to avoid index issues if multiple added
                    currentHeaders.push(h);
                }
            });
        }
    });

    // Create an initial Admin user if Users sheet is empty (except header)
    const usersSheet = ss.getSheetByName(DB_CONFIG.SHEET_NAMES.USERS);
    if (usersSheet.getLastRow() <= 1) {
        const adminEmail = 'admin@' + AUTH_CONFIG.ALLOWED_DOMAIN;
        const adminUser = {
            email: adminEmail,
            role: ROLES.ADMIN,
            name: 'System Admin',
            createdAt: new Date().toISOString()
        };
        createRow(DB_CONFIG.SHEET_NAMES.USERS, adminUser);
        Logger.log('Created initial admin user: ' + adminEmail);
    }
}
