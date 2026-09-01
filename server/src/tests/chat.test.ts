import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.ts";
import { generateToken } from "../utils/jwt.util.ts";

describe("Chat Endpoint Protection & Validation (POST /api/chat/message)", () => {
  const validToken = generateToken({ userId: "507f1f77bcf86cd799439011", email: "student@edureach.edu.in" });

  it("should return 401 when accessed without authentication", async () => {
    const res = await request(app)
      .post("/api/chat/message")
      .send({ message: "What is the fee for B.Tech?" });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Authentication required/i);
  });

  it("should return 400 when message is empty", async () => {
    const res = await request(app)
      .post("/api/chat/message")
      .set("Cookie", [`token=${validToken}`])
      .send({ message: "" });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Message cannot be empty/i);
  });

  it("should return 400 when message exceeds 1000 characters", async () => {
    const longMessage = "A".repeat(1001);
    const res = await request(app)
      .post("/api/chat/message")
      .set("Cookie", [`token=${validToken}`])
      .send({ message: longMessage });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /cannot exceed 1000 characters/i);
  });
});
