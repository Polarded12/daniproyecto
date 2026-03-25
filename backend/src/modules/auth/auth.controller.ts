import type { Request, Response } from "express";
import { loginSchema, registerSchema } from "./auth.schema";
import { loginUser, registerUser } from "./auth.service";

export async function registerHandler(req: Request, res: Response) {
  try {
    const parsed = registerSchema.parse(req.body);
    const user = await registerUser(parsed);
    return res.status(201).json({ user });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
  }
}

export async function loginHandler(req: Request, res: Response) {
  try {
    const parsed = loginSchema.parse(req.body);
    const session = await loginUser(parsed);
    return res.status(200).json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message.startsWith("Auth service unavailable:") ? 500 : 401;
    return res.status(status).json({ message });
  }
}
