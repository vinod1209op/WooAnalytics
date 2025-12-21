-- Add intent enums and customer fields for intent normalization
CREATE TYPE "IntentPrimary" AS ENUM ('stress', 'creativity_focus', 'mood_brainfog', 'growth', 'energy', 'unsure', 'other');
CREATE TYPE "IntentMentalState" AS ENUM ('trauma_recovery', 'spiritual_growth', 'low_productivity', 'high_stress_depression');
CREATE TYPE "IntentImprovementArea" AS ENUM ('emotional_balance', 'cognitive_performance', 'physical_wellbeing', 'spiritual_growth');

ALTER TABLE "customers"
  ADD COLUMN "primaryIntent" "IntentPrimary",
  ADD COLUMN "mentalState" "IntentMentalState",
  ADD COLUMN "improvementArea" "IntentImprovementArea",
  ADD COLUMN "intentUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "rawQuizAnswers" JSONB;

CREATE INDEX "customers_storeId_primaryIntent_idx" ON "customers"("storeId", "primaryIntent");
