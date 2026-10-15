import type { CookieOptions, Request } from "express";

export function getSessionCookieOptions(req: Request): CookieOptions {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedProtocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const isHttps = req.secure || forwardedProtocol === "https";
  return {
    httpOnly: true,
    path: "/",
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
  };
}
