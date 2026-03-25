// Database utilities for safe Supabase operations from backend
// These use SERVICE_ROLE_KEY to bypass RLS when necessary

import { supabase } from "@/config/supabase";

/**
 * Log a habit event and evaluate risk
 * Safe to call from backend with direct table access
 */
export async function logHabitWithRisk(input: {
  patientId: string;
  eventType: string;
  plannedAt?: Date;
  performedAt: Date;
  valueNumeric?: number;
  valueText?: string;
  createdBy: string;
}) {
  const delayMinutes = input.plannedAt
    ? Math.max(0, Math.floor((input.performedAt.getTime() - input.plannedAt.getTime()) / 60000))
    : 0;

  const { data: event, error } = (await supabase
    .from("habit_events")
    .insert({
      patient_id: input.patientId,
      event_type: input.eventType,
      planned_at: input.plannedAt?.toISOString(),
      performed_at: input.performedAt.toISOString(),
      delay_minutes: delayMinutes,
      status: delayMinutes > 0 ? "late" : "done",
      value_numeric: input.valueNumeric,
      value_text: input.valueText,
      created_by: input.createdBy
    })
    .select("id")
    .single()) as any;

  if (error) {
    throw new Error(`Failed to log habit: ${error.message}`);
  }

  return event;
}

/**
 * Create an alert for patient
 */
export async function createAlert(input: {
  patientId: string;
  level: "info" | "yellow" | "red";
  title: string;
  message: string;
  sourceEventId?: number;
  caregiverId?: string;
}) {
  const { data, error } = (await supabase
    .from("alerts")
    .insert({
      patient_id: input.patientId,
      level: input.level,
      title: input.title,
      message: input.message,
      source_event_id: input.sourceEventId,
      caregiver_id: input.caregiverId
    })
    .select("id")
    .single()) as any;

  if (error) {
    throw new Error(`Failed to create alert: ${error.message}`);
  }

  return data;
}

/**
 * Batch create alerts for multiple caregivers
 */
export async function createBulkAlerts(alerts: Array<{
  patientId: string;
  caregiverId: string;
  level: string;
  title: string;
  message: string;
  sourceEventId?: number;
}>) {
  const { error } = await supabase.from("alerts").insert(
    alerts.map((a) => ({
      patient_id: a.patientId,
      caregiver_id: a.caregiverId,
      level: a.level,
      title: a.title,
      message: a.message,
      source_event_id: a.sourceEventId
    }))
  );

  if (error) {
    throw new Error(`Failed to batch create alerts: ${error.message}`);
  }
}

/**
 * Get caregiver links for a patient
 */
export async function getPatientCaregivers(patientId: string) {
  const { data, error } = (await supabase
    .from("caregiver_links")
    .select("caregiver_id,can_receive_alerts")
    .eq("patient_id", patientId)
    .eq("active", true)) as any;

  if (error) {
    throw new Error(`Failed to get caregivers: ${error.message}`);
  }

  return data || [];
}
