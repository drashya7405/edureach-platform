import type { CookieOptions } from "express";

export const AUTH_COOKIE_NAME = "token";

export const getAuthCookieOptions = (): CookieOptions => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: "/",
  };
};

export const getClearCookieOptions = (): CookieOptions => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  };
};
