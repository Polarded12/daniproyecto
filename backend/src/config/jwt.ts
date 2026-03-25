import jwt from "jsonwebtoken";
import { env } from "./env";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: "patient" | "caregiver";
};

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "24h" });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}
