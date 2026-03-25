import { z } from "zod";

export const evaluateRiskSchema = z.object({
  intermittentDelayMinutes: z.number().int().nonnegative().default(0),
  bagDelayMinutes: z.number().int().nonnegative().default(0),
  catheterChangeDelayHours: z.number().int().nonnegative().default(0),
  hydrationMl: z.number().int().nonnegative().default(0),
  hydrationTargetMl: z.number().int().positive().default(1800)
});

export type EvaluateRiskInput = z.infer<typeof evaluateRiskSchema>;
