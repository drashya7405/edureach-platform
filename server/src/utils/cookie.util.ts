import type { CookieOptions } from "express";

export const AUTH_COOKIE_NAME = "token";

const getBaseCookieOptions = (): CookieOptions => {
  const isProd = process.env.NODE_ENV === "production";
  const sameSiteEnv = (process.env.COOKIE_SAME_SITE?.toLowerCase() || "lax") as "lax" | "strict" | "none";
  const sameSite = ["lax", "strict", "none"].includes(sameSiteEnv) ? sameSiteEnv : "lax";

  return {
    httpOnly: true,
    secure: isProd || sameSite === "none",
    sameSite,
    path: "/",
  };
};

export const getAuthCookieOptions = (): CookieOptions => {
  return {
    ...getBaseCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  };
};

export const getClearCookieOptions = (): CookieOptions => {
  return getBaseCookieOptions();
};
