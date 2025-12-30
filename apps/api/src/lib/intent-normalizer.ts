import {
  IntentImprovementArea,
  IntentMentalState,
  IntentPrimary,
} from "@prisma/client";
import { QUIZ_FIELD_IDS, RESULT_FIELD_IDS } from "./quiz-field-map";
import {
  asText,
  mapBipolar,
  mapContraindications,
  mapImprovementArea,
  mapIntegrationOpenness,
  mapMentalState,
  mapPrimaryIntent,
  mapPsychExperience,
  mapReflection,
  mapRoutine,
  mapSchedule,
  mapSensitivity,
  mapStressCoping,
  mapWellnessHistory,
} from "./intent-normalizer/mappers";

export type CustomFieldEntry = { id: string; value: any };

export type NormalizedIntent = {
  primaryIntent: IntentPrimary | null;
  mentalState: IntentMentalState | null;
  improvementArea: IntentImprovementArea | null;
  tags: string[]; // all tags (intent + messaging + safety)
  intentTags: string[];
  messagingTags: string[];
  safetyTags: string[];
  derived: {
    contraindications: string[];
    bipolarRisk: "yes" | "no" | "unsure" | null;
    needsMedicalClearance: boolean;
  };
  messaging: {
    routine?: string | null;
    stressCoping?: string | null;
    reflection?: string | null;
    wellnessHistory?: string | null;
    sensitivity?: string | null;
    psychExperience?: string | null;
    schedule?: string | null;
    integrationOpenness?: string | null;
    resultFields?: Record<string, string>;
  };
  raw: Record<string, any>;
  rawFields: Array<{ id: string; name?: string | null; fieldKey?: string | null; value: any }>;
};

const INTENT_TAG_PREFIX = "intent_";

export function buildIntentTags(intent: {
  primaryIntent: IntentPrimary | null;
  mentalState: IntentMentalState | null;
  improvementArea: IntentImprovementArea | null;
}) {
  const tags: string[] = [];
  if (intent.primaryIntent) tags.push(`${INTENT_TAG_PREFIX}${intent.primaryIntent}`);
  if (intent.mentalState) tags.push(`mh_${intent.mentalState}`);
  if (intent.improvementArea) tags.push(`improve_${intent.improvementArea}`);
  return tags;
}

export function normalizeFromCustomFields(
  customFields: CustomFieldEntry[],
  opts?: { fieldDefs?: Record<string, { name?: string; fieldKey?: string }> }
): NormalizedIntent {
  const rawFields = (customFields || []).map((f) => {
    const def = opts?.fieldDefs?.[String(f.id)];
    return {
      id: String(f.id),
      name: def?.name ?? (f as any).name ?? null,
      fieldKey: def?.fieldKey ?? (f as any).fieldKey ?? (f as any).key ?? null,
      value: f.value,
    };
  });
  const map = Object.fromEntries(rawFields.map((f) => [f.id, f.value]));

  const primaryIntent = mapPrimaryIntent(map[QUIZ_FIELD_IDS.primaryIntent]);
  const mentalState = mapMentalState(map[QUIZ_FIELD_IDS.mentalHealthSituation]);
  const improvementArea = mapImprovementArea(map[QUIZ_FIELD_IDS.improvementArea]);

  const routine = mapRoutine(map[QUIZ_FIELD_IDS.dailyRoutine]);
  const stress = mapStressCoping(map[QUIZ_FIELD_IDS.stressHandling]);
  const reflection = mapReflection(map[QUIZ_FIELD_IDS.journalingTime]);
  const wellness = mapWellnessHistory(map[QUIZ_FIELD_IDS.triedWellnessPractices]);
  const sensitivity = mapSensitivity(map[QUIZ_FIELD_IDS.sensitivity]);
  const psych = mapPsychExperience(map[QUIZ_FIELD_IDS.psychedelicExperience]);
  const schedule = mapSchedule(map[QUIZ_FIELD_IDS.schedulePreference]);
  const integration = mapIntegrationOpenness(map[QUIZ_FIELD_IDS.openToIntegrationPractices]);
  const resultFields = Object.fromEntries(
    Object.entries(RESULT_FIELD_IDS)
      .map(([key, id]) => [key, asText(map[id]).trim()])
      .filter(([, value]) => value)
  );

  const contraindicationTags = mapContraindications(map[QUIZ_FIELD_IDS.contraindications]);
  const bipolar = mapBipolar(map[QUIZ_FIELD_IDS.bipolarFamilyHistory]);
  const needsClearance = contraindicationTags.length > 0 || bipolar.normalized === "yes";

  const intentTags = buildIntentTags({ primaryIntent, mentalState, improvementArea });
  const messagingTags = [
    routine.tag,
    stress.tag,
    reflection.tag,
    wellness.tag,
    sensitivity.tag,
    psych.tag,
    schedule.tag,
    integration.tag,
  ].filter(Boolean) as string[];
  const safetyTags = [...contraindicationTags];
  if (bipolar.tag) safetyTags.push(bipolar.tag);
  if (needsClearance) safetyTags.push("needs_medical_clearance");

  const allTags = Array.from(new Set([...intentTags, ...messagingTags, ...safetyTags]));

  return {
    primaryIntent,
    mentalState,
    improvementArea,
    tags: allTags,
    intentTags,
    messagingTags,
    safetyTags,
    derived: {
      contraindications: contraindicationTags,
      bipolarRisk: bipolar.normalized,
      needsMedicalClearance: needsClearance,
    },
    messaging: {
      routine: routine.normalized ?? null,
      stressCoping: stress.normalized ?? null,
      reflection: reflection.normalized ?? null,
      wellnessHistory: wellness.normalized ?? null,
      sensitivity: sensitivity.normalized ?? null,
      psychExperience: psych.normalized ?? null,
      schedule: schedule.normalized ?? null,
      integrationOpenness: integration.normalized ?? null,
      resultFields: resultFields as Record<string, string>,
    },
    raw: map,
    rawFields,
  };
}
