// Example queries using Supabase RLS with authenticated user context
// These will automatically respect row-level security policies

import { createClient as createServerClient } from "@/utils/supabase/server";

/**
 * Get current user's profile
 * Protected by RLS: user_reads_own_profile
 */
export async function getUserProfile(userId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("app_users")
    .select("id,email,full_name,sex,lesion_level,bladder_management_type,has_caregiver")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return data;
}

/**
 * Get current user's risk assessments
 * Protected by RLS: patient_reads_own_risk
 */
export async function getUserRiskAssessments(userId: string, limit = 10) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("risk_assessments")
    .select("id,score,level,factors,assessed_at")
    .eq("patient_id", userId)
    .order("assessed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching risk assessments:", error);
    return [];
  }

  return data || [];
}

/**
 * Get current user's alerts
 * Protected by RLS: patient_reads_own_alerts
 */
export async function getUserAlerts(userId: string, limit = 20) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("alerts")
    .select("id,level,title,message,acknowledged,created_at")
    .eq("patient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching alerts:", error);
    return [];
  }

  return data || [];
}

/**
 * Get user's habit events
 * Simple query without RLS (add policy if needed)
 */
export async function getUserHabitEvents(userId: string, days = 7) {
  const supabase = await createServerClient();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("habit_events")
    .select("id,event_type,performed_at,delay_minutes,status,value_numeric")
    .eq("patient_id", userId)
    .gte("performed_at", since.toISOString())
    .order("performed_at", { ascending: false });

  if (error) {
    console.error("Error fetching habit events:", error);
    return [];
  }

  return data || [];
}
