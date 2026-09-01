import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import type { Request, Response } from "express";
import app from "../app.ts";
import authMiddleware from "../middleware/auth.middleware.ts";
import { generateToken } from "../utils/jwt.util.ts";
import { AUTH_COOKIE_NAME } from "../utils/cookie.util.ts";

describe("Authentication Endpoints & Middleware Validation", () => {
  describe("Registration Validation (POST /api/auth/register)", () => {
    it("should return 400 when body is empty", async () => {
      const res = await request(app).post("/api/auth/register").send({});
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(Array.isArray(res.body.errors));
    });

    it("should return 400 when name is missing or too short", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "A", email: "student@example.com", password: "password123" });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /name/i);
    });

    it("should return 400 when email is invalid format", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Test Student", email: "not-an-email", password: "password123" });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /valid email/i);
    });

    it("should return 400 when password is under 6 characters", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Test Student", email: "student@example.com", password: "123" });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /at least 6 characters/i);
    });
  });

  describe("Login Validation (POST /api/auth/login)", () => {
    it("should return 400 when email or password is empty", async () => {
      const res = await request(app).post("/api/auth/login").send({});
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it("should return 400 when email format is invalid", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "invalid-email-address", password: "somepassword" });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /valid email/i);
    });
  });

  describe("Authentication Middleware Unit Tests", () => {
    it("should reject requests without cookie or bearer token with 401", () => {
      let statusCode = 0;
      let jsonPayload: any = null;

      const req: Partial<Request> = {
        cookies: {},
        headers: {},
      };
      const res: Partial<Response> = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              jsonPayload = data;
            },
          } as any;
        },
      };

      authMiddleware(req as Request, res as Response, () => {});
      assert.equal(statusCode, 401);
      assert.equal(jsonPayload.success, false);
      assert.match(jsonPayload.message, /Authentication required/i);
    });

    it("should reject requests with malformed or invalid token with 401", () => {
      let statusCode = 0;
      let jsonPayload: any = null;

      const req: Partial<Request> = {
        cookies: {},
        headers: { authorization: "Bearer invalid.fake.token" },
      };
      const res: Partial<Response> = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              jsonPayload = data;
            },
          } as any;
        },
      };

      authMiddleware(req as Request, res as Response, () => {});
      assert.equal(statusCode, 401);
      assert.equal(jsonPayload.success, false);
    });

    it("should authenticate and populate req.user from HTTP-only cookie", () => {
      const validToken = generateToken({
        userId: "507f1f77bcf86cd799439011",
        email: "test-user@edureach.edu.in",
      });

      let nextCalled = false;
      const req: Partial<Request> = {
        cookies: { [AUTH_COOKIE_NAME]: validToken },
        headers: {},
      };
      const res: Partial<Response> = {};

      authMiddleware(req as Request, res as Response, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
      assert.ok(req.user);
      assert.equal(req.user.userId, "507f1f77bcf86cd799439011");
      assert.equal(req.user.email, "test-user@edureach.edu.in");
    });

    it("should authenticate and populate req.user from Authorization Bearer header", () => {
      const validToken = generateToken({
        userId: "607f1f77bcf86cd799439022",
        email: "bearer-user@edureach.edu.in",
      });

      let nextCalled = false;
      const req: Partial<Request> = {
        cookies: {},
        headers: { authorization: `Bearer ${validToken}` },
      };
      const res: Partial<Response> = {};

      authMiddleware(req as Request, res as Response, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
      assert.ok(req.user);
      assert.equal(req.user.userId, "607f1f77bcf86cd799439022");
    });
  });

  describe("Logout Endpoint (POST /api/auth/logout)", () => {
    it("should return 200 and success response", async () => {
      const res = await request(app).post("/api/auth/logout");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.message, "Logged out successfully.");
    });
  });
});
