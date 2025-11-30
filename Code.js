/**
 * Code.js
 * Main entry point for the Web App.
 */

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Backend running" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const result = handleRequest(body);

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}