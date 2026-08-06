import type { CookieOptions, Request } from "express";
import { ONE_YEAR_MS } from "@shared/const";

export function getSessionCookieOptions(req: Request): CookieOptions {
  const secure = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ONE_YEAR_MS,
  };
}
