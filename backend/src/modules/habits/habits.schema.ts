import { z } from "zod";

export const habitLogSchema = z.object({
  eventType: z.enum(["catheterization", "bag_empty", "hydration", "catheter_change", "hygiene_check"]),
  plannedAt: z.string().datetime().optional(),
  performedAt: z.string().datetime(),
  valueNumeric: z.number().optional(),
  valueText: z.string().max(500).optional(),
  intermittentDelayMinutes: z.number().int().nonnegative().optional(),
  bagDelayMinutes: z.number().int().nonnegative().optional(),
  catheterChangeDelayHours: z.number().int().nonnegative().optional(),
  hydrationMl: z.number().int().nonnegative().optional(),
  hydrationTargetMl: z.number().int().positive().optional()
});

export type HabitLogInput = z.infer<typeof habitLogSchema>;
