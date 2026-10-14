import type { CookieOptions, Request } from "express";

export function getSessionCookieOptions(req: Request): CookieOptions {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const isHttps = req.secure || forwardedProto === "https" || (Array.isArray(forwardedProto) && forwardedProto.includes("https"));
  return {
    httpOnly: true,
    path: "/",
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
  };
}
