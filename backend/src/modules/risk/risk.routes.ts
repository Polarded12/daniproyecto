import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { evaluateRiskSchema } from "./risk.schema";
import { calculateRisk } from "./risk.service";
import { supabase } from "@/config/supabase";

export const riskRouter = Router();

riskRouter.post("/evaluate", requireAuth, async (req, res) => {
  try {
    const payload = evaluateRiskSchema.parse(req.body);
    const result = calculateRisk(payload);

    const { error } = await supabase.from("risk_assessments").insert({
      patient_id: req.user!.id,
      score: result.score,
      level: result.level,
      factors: { triggers: result.factors }
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid payload" });
  }
});
