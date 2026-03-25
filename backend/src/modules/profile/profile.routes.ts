import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { supabase } from "@/config/supabase";

export const profileRouter = Router();

profileRouter.get("/me", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("app_users")
    .select("id,email,full_name,sex,lesion_level,bladder_management_type,has_caregiver")
    .eq("id", req.user!.id)
    .single();

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(200).json(data);
});
