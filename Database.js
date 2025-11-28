/**
 * Database.js
 * Handles all direct interactions with Google Sheets.
 */

const DB_CONFIG = {
  SHEET_NAMES: {
    USERS: 'Users',
    MEETINGS: 'Meetings',
    CHECKINS: 'CheckIns',
    BADGES: 'Badges',
    EXCUSES: 'Excuses'
  }
};

/**
 * Helper to get a sheet by name.
 */
function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    // Auto-create if missing (handled in Setup, but safety here)
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

/**
 * Reads all data from a sheet and returns it as an array of objects.
 * Assumes the first row is headers.
 */
function readAll(sheetName) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow <= 1) return []; // Only headers or empty

  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = data[0];
  const rows = data.slice(1);

  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * Appends a new row to a sheet.
 * @param {string} sheetName 
 * @param {Object} dataObj - Object with keys matching headers
 */
function createRow(sheetName, dataObj) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const row = headers.map(header => {
    return dataObj.hasOwnProperty(header) ? dataObj[header] : '';
  });

  sheet.appendRow(row);
  return dataObj;
}

/**
 * Finds a single row matching a criteria function.
 */
function findOne(sheetName, predicate) {
  const all = readAll(sheetName);
  return all.find(predicate);
}

/**
 * Updates a row based on a unique ID.
 * @param {string} sheetName
 * @param {string|number} id - The value to search for
 * @param {Object} updates - Key-value pairs to update
 * @param {string} [idColumnName='id'] - The name of the column to search in (default: 'id')
 */
function updateRow(sheetName, id, updates, idColumnName = 'id') {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf(idColumnName);

  if (idIndex === -1) throw new Error('No "' + idColumnName + '" column found in ' + sheetName);

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == id) {
      // Found row, update it
      headers.forEach((header, colIndex) => {
        if (updates.hasOwnProperty(header)) {
          sheet.getRange(i + 1, colIndex + 1).setValue(updates[header]);
        }
      });
      return true;
    }
  }
  return false;
}

/**
 * Deletes a row based on a unique ID.
 * @param {string} sheetName
 * @param {string|number} id
 * @param {string} [idColumnName='id']
 */
function deleteRow(sheetName, id, idColumnName = 'id') {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf(idColumnName);

  if (idIndex === -1) throw new Error('No "' + idColumnName + '" column found in ' + sheetName);

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}
