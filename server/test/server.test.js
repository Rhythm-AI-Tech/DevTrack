const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { app } = require("../src/server");

let server;
let baseUrl;

test("DevTracker API exposes a healthy JSON health check", async (t) => {
  if (!server) {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  }
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
});

test("unknown API routes return a consistent JSON 404", async () => {
  const response = await fetch(`${baseUrl}/api/does-not-exist`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).code, "API_NOT_FOUND");
});

test("AI route requires a valid authenticated session", async () => {
  const response = await fetch(`${baseUrl}/api/v1/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Help me with arrays" }),
  });
  assert.equal(response.status, 401);
});

test("invalid JSON is returned as a structured client error", async () => {
  const response = await fetch(`${baseUrl}/api/v1/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_JSON");
});

after(() => {
  if (server) return new Promise((resolve) => server.close(resolve));
});
