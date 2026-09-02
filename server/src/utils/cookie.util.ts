import type { CookieOptions } from "express";

export const AUTH_COOKIE_NAME = "token";

const getBaseCookieOptions = (): CookieOptions => {
  const isProd = process.env.NODE_ENV === "production";
  const sameSiteEnv = process.env.COOKIE_SAME_SITE?.toLowerCase();
  
  // Default to "none" in production for cross-site (Vercel <-> Render) deployments; "lax" in development
  const defaultSameSite = isProd ? "none" : "lax";
  const sameSite: "lax" | "strict" | "none" =
    sameSiteEnv === "lax" || sameSiteEnv === "strict" || sameSiteEnv === "none"
      ? sameSiteEnv
      : defaultSameSite;

  // Browsers require secure=true whenever sameSite="none"
  const isSecure = sameSite === "none" || isProd;

  return {
    httpOnly: true,
    secure: isSecure,
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

