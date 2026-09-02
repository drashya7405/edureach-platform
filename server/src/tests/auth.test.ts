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
    it("should reject requests without cookie with 401", () => {
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

    it("should reject requests with malformed or invalid cookie with 401", () => {
      let statusCode = 0;
      let jsonPayload: any = null;

      const req: Partial<Request> = {
        cookies: { [AUTH_COOKIE_NAME]: "invalid.fake.token" },
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
  });

  describe("Logout Endpoint (POST /api/auth/logout)", () => {
    it("should return 200 and clear the auth cookie", async () => {
      const res = await request(app).post("/api/auth/logout");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.message, "Logged out successfully.");

      const rawCookies = res.headers["set-cookie"];
      const cookieHeaders = Array.isArray(rawCookies)
        ? rawCookies
        : typeof rawCookies === "string"
          ? [rawCookies]
          : [];
      assert.ok(cookieHeaders.length > 0);
      assert.ok(
        cookieHeaders.some((cookie) => cookie.startsWith("token=")),
      );
    });
  });

  describe("CORS Policy", () => {
    it("should allow configured localhost origins in development", async () => {
      const res = await request(app)
        .get("/api/health/live")
        .set("Origin", "http://localhost:5173");

      assert.equal(res.status, 200);
      assert.equal(res.headers["access-control-allow-origin"], "http://localhost:5173");
      assert.equal(res.headers["access-control-allow-credentials"], "true");
    });

    it("should reject unauthorized Vercel origins in production", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalClientUrl = process.env.CLIENT_URL;

      try {
        process.env.NODE_ENV = "production";
        process.env.CLIENT_URL = "https://edureach.example.com";

        const res = await request(app)
          .get("/api/health/live")
          .set("Origin", "https://random-project.vercel.app");

        assert.notEqual(
          res.headers["access-control-allow-origin"],
          "https://random-project.vercel.app",
        );
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        process.env.CLIENT_URL = originalClientUrl;
      }
    });

    it("should allow configured production origin", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalClientUrl = process.env.CLIENT_URL;

      try {
        process.env.NODE_ENV = "production";
        process.env.CLIENT_URL = "https://edureach.example.com";

        const res = await request(app)
          .get("/api/health/live")
          .set("Origin", "https://edureach.example.com");

        assert.equal(res.status, 200);
        assert.equal(
          res.headers["access-control-allow-origin"],
          "https://edureach.example.com",
        );
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        process.env.CLIENT_URL = originalClientUrl;
      }
    });
  });

  describe("Cookie Options Configuration", () => {
    it("should configure SameSite=None and Secure=true in production by default", async () => {
      const { getAuthCookieOptions, getClearCookieOptions } = await import("../utils/cookie.util.ts");
      const originalNodeEnv = process.env.NODE_ENV;
      const originalSameSite = process.env.COOKIE_SAME_SITE;

      try {
        process.env.NODE_ENV = "production";
        delete process.env.COOKIE_SAME_SITE;

        const authOpts = getAuthCookieOptions();
        assert.equal(authOpts.sameSite, "none");
        assert.equal(authOpts.secure, true);
        assert.equal(authOpts.httpOnly, true);
        assert.equal(authOpts.path, "/");

        const clearOpts = getClearCookieOptions();
        assert.equal(clearOpts.sameSite, "none");
        assert.equal(clearOpts.secure, true);
        assert.equal(clearOpts.httpOnly, true);
        assert.equal(clearOpts.path, "/");
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        if (originalSameSite !== undefined) {
          process.env.COOKIE_SAME_SITE = originalSameSite;
        } else {
          delete process.env.COOKIE_SAME_SITE;
        }
      }
    });

    it("should configure SameSite=lax and Secure=false in development by default", async () => {
      const { getAuthCookieOptions } = await import("../utils/cookie.util.ts");
      const originalNodeEnv = process.env.NODE_ENV;
      const originalSameSite = process.env.COOKIE_SAME_SITE;

      try {
        process.env.NODE_ENV = "development";
        delete process.env.COOKIE_SAME_SITE;

        const authOpts = getAuthCookieOptions();
        assert.equal(authOpts.sameSite, "lax");
        assert.equal(authOpts.secure, false);
        assert.equal(authOpts.httpOnly, true);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        if (originalSameSite !== undefined) {
          process.env.COOKIE_SAME_SITE = originalSameSite;
        } else {
          delete process.env.COOKIE_SAME_SITE;
        }
      }
    });
  });
});
