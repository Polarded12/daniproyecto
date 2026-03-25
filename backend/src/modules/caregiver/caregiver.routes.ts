import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { supabase } from "@/config/supabase";
import { linkCaregiverSchema } from "./caregiver.schema";

export const caregiverRouter = Router();

caregiverRouter.post("/link", requireAuth, async (req, res) => {
  try {
    const payload = linkCaregiverSchema.parse(req.body);

    const { data: caregiver, error: caregiverError } = await supabase
      .from("app_users")
      .select("id,role")
      .eq("email", payload.caregiverEmail)
      .single();

    if (caregiverError || !caregiver || caregiver.role !== "caregiver") {
      return res.status(404).json({ message: "Caregiver not found" });
    }

    const { error } = await supabase.from("caregiver_links").upsert({
      patient_id: req.user!.id,
      caregiver_id: caregiver.id,
      can_view_risk: payload.canViewRisk,
      can_log_events: payload.canLogEvents,
      can_receive_alerts: payload.canReceiveAlerts,
      active: true
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid payload" });
  }
});

caregiverRouter.get("/links", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("caregiver_links")
    .select("id,patient_id,caregiver_id,can_view_risk,can_log_events,can_receive_alerts,active")
    .or(`patient_id.eq.${req.user!.id},caregiver_id.eq.${req.user!.id}`);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(200).json(data);
});
