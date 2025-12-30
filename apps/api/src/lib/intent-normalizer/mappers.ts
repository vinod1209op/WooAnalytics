import {
  IntentImprovementArea,
  IntentMentalState,
  IntentPrimary,
} from "@prisma/client";

export function asText(value: any): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.filter(Boolean).join(" | ");
  return String(value);
}

export function mapPrimaryIntent(answer?: any): IntentPrimary | null {
  const a = asText(answer).toLowerCase();
  if (!a) return null;
  if (a.includes("anxiety") || a.includes("stress")) return "stress";
  if (a.includes("creativity") || a.includes("focus")) return "creativity_focus";
  if (a.includes("depression") || a.includes("brain fog")) return "mood_brainfog";
  if (a.includes("growth")) return "growth";
  if (a.includes("energy") || a.includes("motivation")) return "energy";
  if (a.includes("exploring") || a.includes("no")) return "unsure";
  if (a.includes("other")) return "other";
  return null;
}

export function mapMentalState(answer?: any): IntentMentalState | null {
  const a = asText(answer).toLowerCase();
  if (!a) return null;
  if (a.includes("trauma")) return "trauma_recovery";
  if (a.includes("spiritual")) return "spiritual_growth";
  if (a.includes("focus") || a.includes("motivation") || a.includes("productivity")) {
    return "low_productivity";
  }
  if (a.includes("anxiety") || a.includes("stress") || a.includes("depression") || a.includes("fatigue")) {
    return "high_stress_depression";
  }
  return null;
}

export function mapImprovementArea(answer?: any): IntentImprovementArea | null {
  const a = asText(answer).toLowerCase();
  if (!a) return null;
  if (a.includes("emotional") || a.includes("balance") || a.includes("anxiety")) {
    return "emotional_balance";
  }
  if (a.includes("cognitive") || a.includes("focus") || a.includes("creativity")) {
    return "cognitive_performance";
  }
  if (a.includes("physical") || a.includes("energy") || a.includes("vital")) {
    return "physical_wellbeing";
  }
  if (a.includes("spiritual")) return "spiritual_growth";
  return null;
}

export function mapRoutine(value?: any): { tag?: string; normalized?: string | null } {
  const v = asText(value).toLowerCase();
  if (!v) return { normalized: null };
  if (v.includes("structured")) return { tag: "routine_structured", normalized: "structured" };
  if (v.includes("flexible")) return { tag: "routine_flexible", normalized: "flexible" };
  if (v.includes("busy")) return { tag: "routine_busy", normalized: "busy" };
  if (v.includes("balanced")) return { tag: "routine_balanced", normalized: "balanced" };
  if (v.includes("inconsistent")) return { tag: "routine_inconsistent", normalized: "inconsistent" };
  return { normalized: v };
}

export function mapStressCoping(value?: any): { tag?: string; normalized?: string | null } {
  const v = asText(value).toLowerCase();
  if (!v) return { normalized: null };
  if (v.includes("meditation") || v.includes("mindfulness")) {
    return { tag: "coping_mindfulness", normalized: "mindfulness" };
  }
  if (v.includes("physical") || v.includes("exercise")) {
    return { tag: "coping_exercise", normalized: "exercise" };
  }
  if (v.includes("creative")) return { tag: "coping_creativity", normalized: "creativity" };
  if (v.includes("overwhelmed")) return { tag: "coping_overwhelmed", normalized: "overwhelmed" };
  return { normalized: v };
}

export function mapReflection(value?: any): { tag?: string; normalized?: string | null } {
  const v = asText(value).toLowerCase();
  if (!v) return { normalized: null };
  if (v.includes("daily")) return { tag: "reflection_daily", normalized: "daily" };
  if (v.includes("weekly")) return { tag: "reflection_weekly", normalized: "weekly" };
  if (v.includes("monthly")) return { tag: "reflection_monthly", normalized: "monthly" };
  if (v.includes("not sure") || v.includes("unsure")) {
    return { tag: "reflection_unsure", normalized: "unsure" };
  }
  return { normalized: v };
}

export function mapWellnessHistory(value?: any): { tag?: string; normalized?: string | null } {
  const v = asText(value).toLowerCase();
  if (!v) return { normalized: null };
  if (v.includes("success")) return { tag: "wellness_tried_success", normalized: "success" };
  if (v.includes("didn't find") || v.includes("not effective")) {
    return { tag: "wellness_tried_no_effect", normalized: "no_effect" };
  }
  if (v.includes("new")) return { tag: "wellness_new", normalized: "new" };
  if (v.includes("other")) return { tag: "wellness_other", normalized: "other" };
  return { normalized: v };
}

export function mapSensitivity(value?: any): { tag?: string; normalized?: string | null } {
  const v = asText(value).toLowerCase();
  if (!v) return { normalized: null };
  if (v.includes("high")) return { tag: "sensitivity_high", normalized: "high" };
  if (v.includes("moderate")) return { tag: "sensitivity_moderate", normalized: "moderate" };
  if (v.includes("low")) return { tag: "sensitivity_low", normalized: "low" };
  if (v.includes("not sure") || v.includes("unsure")) {
    return { tag: "sensitivity_unsure", normalized: "unsure" };
  }
  return { normalized: v };
}

export function mapPsychExperience(value?: any): { tag?: string; normalized?: string | null } {
  const v = asText(value).toLowerCase();
  if (!v) return { normalized: null };
  if (v.includes("experienced")) return { tag: "psych_experienced", normalized: "experienced" };
  if (v.includes("some experience") || v.includes("cautious")) {
    return { tag: "psych_some_experience_cautious", normalized: "some_cautious" };
  }
  if (v.includes("curious") && v.includes("no experience")) {
    return { tag: "psych_curious_none", normalized: "curious_none" };
  }
  if (v.includes("adverse") || v.includes("unsure")) {
    return { tag: "psych_adverse_unsure", normalized: "adverse_unsure" };
  }
  if (v.includes("not interested")) return { tag: "psych_not_interested", normalized: "not_interested" };
  return { normalized: v };
}

export function mapSchedule(value?: any): { tag?: string; normalized?: string | null } {
  const v = asText(value).toLowerCase();
  if (!v) return { normalized: null };
  if (v.includes("daily")) return { tag: "schedule_daily", normalized: "daily" };
  if (v.includes("few days") || v.includes("per week")) {
    return { tag: "schedule_few_days_week", normalized: "few_days_week" };
  }
  if (v.includes("monthly") || v.includes("cycles")) {
    return { tag: "schedule_monthly_cycles", normalized: "monthly_cycles" };
  }
  if (v.includes("not sure") || v.includes("unsure")) {
    return { tag: "schedule_unsure", normalized: "unsure" };
  }
  return { normalized: v };
}

export function mapIntegrationOpenness(value?: any): {
  tag?: string | null;
  normalized?: string | null;
} {
  const v = asText(value).toLowerCase();
  if (!v) return { normalized: null, tag: null };
  if (v.includes("already")) {
    return { tag: "integration_already_doing", normalized: "already_doing" };
  }
  if (v.includes("need guidance") || v.includes("guidance")) {
    return { tag: "integration_needs_guidance", normalized: "needs_guidance" };
  }
  if (v.includes("maybe") || v.includes("not sure") || v.includes("unsure")) {
    return { tag: "integration_unsure", normalized: "unsure" };
  }
  if (v.includes("simpler") || v.startsWith("no")) {
    return { tag: "integration_simple_preference", normalized: "simple_preference" };
  }
  return { normalized: null, tag: null };
}

export function mapContraindications(value: any): string[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  const tags: string[] = [];
  for (const item of arr) {
    const v = String(item || "").toLowerCase();
    if (v.includes("ssri")) tags.push("med_ssri");
    else if (v.includes("lithium")) tags.push("med_lithium");
    else if (v.includes("blood pressure")) tags.push("cond_high_bp");
    else if (v.includes("epilepsy")) tags.push("cond_epilepsy");
    else if (v.includes("stroke")) tags.push("cond_recent_stroke");
  }
  return tags;
}

export function mapBipolar(value?: string | null): {
  tag?: string;
  normalized: "yes" | "no" | "unsure" | null;
} {
  const v = (value || "").toLowerCase();
  if (!v) return { normalized: null };
  if (v.includes("yes")) return { tag: "bipolar_yes", normalized: "yes" };
  if (v.includes("no")) return { tag: "bipolar_no", normalized: "no" };
  if (v.includes("not sure") || v.includes("unsure")) {
    return { tag: "bipolar_unsure", normalized: "unsure" };
  }
  return { normalized: null };
}
