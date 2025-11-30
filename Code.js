/**
 * Code.js
 * Main entry point for the Web App.
 */

function doGet(e) {
  // service ok
  var output = ContentService.createTextOutput(
    JSON.stringify({ status: 'ok', message: 'Backend is running.' })
  );
  return withCors(output);
}

function doPost(e) {
    return withCors(handleRequest(e));
}

function doOptions(e) {
  // The body can be empty; we only need to send the CORS headers.
  var output = ContentService.createTextOutput('');
  return withCors(output);
}

// shut CORS up
function withCors(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400'); // cache pre‑flight for 1 day
}
