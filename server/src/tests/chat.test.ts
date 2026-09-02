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
      .set("Authorization", `Bearer ${validToken}`)
      .send({ message: "" });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Message cannot be empty/i);
  });

  it("should return 400 when message exceeds 1000 characters", async () => {
    const longMessage = "A".repeat(1001);
    const res = await request(app)
      .post("/api/chat/message")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ message: longMessage });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /cannot exceed 1000 characters/i);
  });

  describe("Multi-User Token Authentication & Isolation", () => {
    const userAToken = generateToken({ userId: "507f191e810c19729de860ea", email: "drashya@edureach.edu.in" });
    const userBToken = generateToken({ userId: "507f191e810c19729de860eb", email: "jipul@edureach.edu.in" });

    it("should accept valid authenticated requests for User A", async () => {
      const res = await request(app)
        .post("/api/chat/message")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ message: "" }); // triggers validation, proving authMiddleware passed for User A

      // Status 400 means auth succeeded and reached controller body validation
      assert.equal(res.status, 400);
      assert.match(res.body.message, /Message cannot be empty/i);
    });

    it("should accept valid authenticated requests for User B independently", async () => {
      const res = await request(app)
        .post("/api/chat/message")
        .set("Authorization", `Bearer ${userBToken}`)
        .send({ message: "" }); // triggers validation, proving authMiddleware passed for User B

      // Status 400 means auth succeeded and reached controller body validation
      assert.equal(res.status, 400);
      assert.match(res.body.message, /Message cannot be empty/i);
    });

    it("should reject tampered or cross-user corrupted token with 401", async () => {
      const res = await request(app)
        .post("/api/chat/message")
        .set("Authorization", `Bearer ${userAToken.slice(0, -5)}fake`)
        .send({ message: "What is the fee?" });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Invalid authentication token|Authentication failed/i);
    });
  });
});
