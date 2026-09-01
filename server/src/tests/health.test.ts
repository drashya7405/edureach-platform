import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.ts";

describe("Health API Endpoints", () => {
  it("GET /api/health/live should return 200 and alive status", async () => {
    const res = await request(app).get("/api/health/live");
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.status, "alive");
    assert.ok(res.body.timestamp);
  });

  it("GET /api/health/ready should return structured readiness response", async () => {
    const res = await request(app).get("/api/health/ready");
    assert.ok([200, 503].includes(res.status));
    assert.equal(typeof res.body.success, "boolean");
    assert.ok(["ready", "not_ready"].includes(res.body.status));
    assert.ok(res.body.database);
  });

  it("GET /api/health should return non-sensitive diagnostics", async () => {
    const res = await request(app).get("/api/health");
    assert.ok([200, 503].includes(res.status));
    assert.ok(res.body.data);
    assert.equal(res.body.data.server, "up");
    assert.equal(typeof res.body.data.auth.jwtConfigured, "boolean");
    assert.equal(typeof res.body.data.ai.googleApiConfigured, "boolean");
    // Ensure no secrets are present in response
    assert.equal(res.body.data.jwtSecret, undefined);
    assert.equal(res.body.data.googleApiKey, undefined);
    assert.equal(res.body.data.mongoUri, undefined);
  });

  it("GET /api/unknown-route should return 404 Route not found", async () => {
    const res = await request(app).get("/api/non-existent-endpoint");
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Route not found.");
  });
});
