import type { EvaluateRiskInput } from "./risk.schema";

export function calculateRisk(input: EvaluateRiskInput) {
  let score = 0;
  const factors: string[] = [];

  if (input.intermittentDelayMinutes >= 120) {
    score += 35;
    factors.push("intermittent_red_delay");
  } else if (input.intermittentDelayMinutes >= 60) {
    score += 20;
    factors.push("intermittent_yellow_delay");
  }

  if (input.bagDelayMinutes >= 240) {
    score += 30;
    factors.push("bag_red_delay");
  } else if (input.bagDelayMinutes >= 120) {
    score += 15;
    factors.push("bag_yellow_delay");
  }

  if (input.catheterChangeDelayHours >= 168) {
    score += 25;
    factors.push("catheter_change_high_delay");
  } else if (input.catheterChangeDelayHours >= 72) {
    score += 12;
    factors.push("catheter_change_moderate_delay");
  }

  const hydrationRatio = input.hydrationMl / input.hydrationTargetMl;
  if (hydrationRatio < 0.5) {
    score += 18;
    factors.push("hydration_critical_low");
  } else if (hydrationRatio < 0.8) {
    score += 10;
    factors.push("hydration_low");
  }

  const level = score >= 45 ? "red" : score >= 20 ? "yellow" : "info";

  return { score, level, factors };
}
