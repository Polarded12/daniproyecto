import { z } from "zod";

export const linkCaregiverSchema = z.object({
  caregiverEmail: z.string().email(),
  canViewRisk: z.boolean().default(true),
  canLogEvents: z.boolean().default(true),
  canReceiveAlerts: z.boolean().default(true)
});
