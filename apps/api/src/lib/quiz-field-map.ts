export const QUIZ_FIELD_IDS = {
  primaryIntent: "XDhKkQ6WohLtonu0EYT2",
  mentalHealthSituation: "02OBhz4we4e7FprMTOD7",
  improvementArea: "RzoVk0gnnfDDsMS9hJSN",

  dailyRoutine: "51fZP5KDJZXSOSagc9Qy",
  stressHandling: "q1VMnLavqNDJRTT7kDjI",
  journalingTime: "iAnfbO5r8rr8c5pieJt3",
  triedWellnessPractices: "Ff3BdfNcaPjxQzvQVbwx",
  sensitivity: "Q1IFJudAiTEFfFeaZjpD",
  psychedelicExperience: "jkp40LbD4NeO9odm2jr7",
  schedulePreference: "wVm4uLPaclfZermhduZk",
  openToIntegrationPractices: "73AwpmyzFYv3QPbviFKY",
  contraindications: "RFn96OcfxJ0YZVX2zHCx",
  bipolarFamilyHistory: "22Fq73xN52h4M7nkE2R2",
} as const;

// Long-form result copy fields (not for segmentation; for personalization only)
export const RESULT_FIELD_IDS = {
  resultA2: "uMQiFfz1dWBDyYm4z7qh",
  resultB1: "A6OjiZfK7115X789VlVf",
  resultB2: "nUrBvoTRT4hffalhOP3h",
  resultB3: "3pHdzqtXG1Rulx32Qvya",
  resultC1: "kAtz3VXVxvT3PIgYh2G6",
  resultC2: "iiJK3jZGihMOQmdYymwn",
  resultC3: "GRh79361qAPe1bWbBoVt",
  resultD1: "RmLPtm4ecjtWike6XDfJ",
  resultD2: "zB3umwAM2SnXFnQLTXZ6",
  resultE1: "cQZTer0XeG1AMEckkBsT",
} as const;

export type QuizFieldIds = typeof QUIZ_FIELD_IDS;
export type ResultFieldIds = typeof RESULT_FIELD_IDS;
