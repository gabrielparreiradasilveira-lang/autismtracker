import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { COOKIE_NAME } from "@shared/const";
import type { SessionUser } from "../../drizzle/schema";
import { getUserById } from "../db";
import { ENV } from "./env";

export interface TrpcContext {
  req: Request;
  res: Response;
  user: SessionUser | null;
}

export function createSessionToken(userId: number): string {
  return jwt.sign({ userId }, ENV.jwtSecret, { expiresIn: "365d" });
}

export function verifySessionToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, ENV.jwtSecret) as { userId?: number };
    return typeof payload.userId === "number" ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function createContext({ req, res }: { req: Request; res: Response }): Promise<TrpcContext> {
  let user: SessionUser | null = null;

  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const userId = verifySessionToken(token);
    if (userId) {
      const dbUser = await getUserById(userId);
      if (dbUser) {
        const { passwordHash: _passwordHash, ...sessionUser } = dbUser;
        user = sessionUser;
      }
    }
  }

  return { req, res, user };
}
