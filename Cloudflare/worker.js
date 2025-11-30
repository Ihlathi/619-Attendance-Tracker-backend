export default {
  async fetch(request) {
    const target = "https://script.google.com/macros/s/AKfycbxrdc8NeAB5PRG_naBwOSb_vtCBITpBL2HzIqoYNRaUghVXxOOQnH7IEX9hcM4aZmuKXA/exec";

    // ---- Handle CORS Preflight ----
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    // ---- Build Request to GAS ----
    let init = {
      method: request.method,
      headers: {},
    };

    // Forward body correctly for POST
    if (request.method === "POST") {
      init.body = await request.text(); // Apps Script expects text unless it's JSON.parse()
      init.headers["Content-Type"] = request.headers.get("Content-Type") || "text/plain";
    }

    // ---- Forward request to Google Apps Script ----
    const resp = await fetch(target, init);
    const text = await resp.text();

    // ---- Return response with CORS ----
    return new Response(text, {
      status: resp.status,
      headers: {
        "Content-Type": resp.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};