import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(["patient", "caregiver"]).default("patient"),
  sex: z.enum(["male", "female", "other"]),
  lesionLevel: z.enum(["thoracic", "lumbar", "sacral"]),
  bladderManagementType: z.enum(["indwelling_catheter", "intermittent_catheterization", "condom_catheter"]),
  hasCaregiver: z.boolean().default(false)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
