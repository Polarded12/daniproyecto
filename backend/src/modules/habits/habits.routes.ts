import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { habitLogSchema } from "./habits.schema";
import { supabase } from "@/config/supabase";
import { calculateRisk } from "@/modules/risk/risk.service";

export const habitsRouter = Router();

habitsRouter.post("/log", requireAuth, async (req, res) => {
  try {
    const payload = habitLogSchema.parse(req.body);
    const patientId = req.user!.id;

    const plannedAt = payload.plannedAt ? new Date(payload.plannedAt) : null;
    const performedAt = new Date(payload.performedAt);

    const delayMinutes = plannedAt
      ? Math.max(0, Math.floor((performedAt.getTime() - plannedAt.getTime()) / 60000))
      : 0;

    const { data: eventRow, error: eventError } = await supabase
      .from("habit_events")
      .insert({
        patient_id: patientId,
        event_type: payload.eventType,
        planned_at: plannedAt?.toISOString(),
        performed_at: performedAt.toISOString(),
        delay_minutes: delayMinutes,
        status: delayMinutes > 0 ? "late" : "done",
        value_numeric: payload.valueNumeric,
        value_text: payload.valueText,
        created_by: req.user!.id
      })
      .select("id")
      .single();

    if (eventError) {
      return res.status(400).json({ message: eventError.message });
    }

    const riskInput = {
      intermittentDelayMinutes: payload.intermittentDelayMinutes ?? (payload.eventType === "catheterization" ? delayMinutes : 0),
      bagDelayMinutes: payload.bagDelayMinutes ?? (payload.eventType === "bag_empty" ? delayMinutes : 0),
      catheterChangeDelayHours: payload.catheterChangeDelayHours ?? (payload.eventType === "catheter_change" ? Math.floor(delayMinutes / 60) : 0),
      hydrationMl: payload.hydrationMl ?? (payload.eventType === "hydration" ? payload.valueNumeric ?? 0 : 0),
      hydrationTargetMl: payload.hydrationTargetMl ?? 1800
    };

    const risk = calculateRisk(riskInput);

    await supabase.from("risk_assessments").insert({
      patient_id: patientId,
      score: risk.score,
      level: risk.level,
      factors: { triggers: risk.factors }
    });

    if (risk.level === "yellow" || risk.level === "red") {
      const { data: alertRow } = await supabase
        .from("alerts")
        .insert({
          patient_id: patientId,
          source_event_id: eventRow.id,
          level: risk.level,
          title: risk.level === "red" ? "Riesgo alto detectado" : "Riesgo moderado detectado",
          message: `Factores: ${risk.factors.join(", ") || "sin detalle"}`
        })
        .select("id")
        .single();

      const { data: caregivers } = await supabase
        .from("caregiver_links")
        .select("caregiver_id,can_receive_alerts")
        .eq("patient_id", patientId)
        .eq("active", true);

      if (alertRow && caregivers?.length) {
        const mirrored = caregivers
          .filter((c: any) => c.can_receive_alerts)
          .map((c: any) => ({
            patient_id: patientId,
            caregiver_id: c.caregiver_id,
            source_event_id: eventRow.id,
            level: risk.level,
            title: "Alerta espejo cuidador",
            message: "El paciente requiere atencion en su rutina vesical"
          }));

        if (mirrored.length) {
          await supabase.from("alerts").insert(mirrored);
        }
      }
    }

    return res.status(201).json({ eventId: eventRow.id, risk });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid payload" });
  }
});
