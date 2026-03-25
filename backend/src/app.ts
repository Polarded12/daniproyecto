import express from "express";
import cors from "cors";
import { env } from "@/config/env";
import { profileRouter } from "@/modules/profile/profile.routes";
import { riskRouter } from "@/modules/risk/risk.routes";
import { habitsRouter } from "@/modules/habits/habits.routes";
import { caregiverRouter } from "@/modules/caregiver/caregiver.routes";

export const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/profile", profileRouter);
app.use("/api/risk", riskRouter);
app.use("/api/habits", habitsRouter);
app.use("/api/caregiver", caregiverRouter);
