-- Migration: Context Integration für Interactive Learning Pipeline
-- Datum: 2025-10-17
-- Zweck: Ermöglicht Context-Sharing zwischen Dialog, Story und Quiz Phasen

-- ============================================
-- 1. LESSON TABLE: Füge research_data hinzu
-- ============================================
-- Speichert die Research-Daten aus Stage 1 (Facts, Concepts, Examples)
-- Diese Daten werden später in Dialog, Story und Quiz injiziert

ALTER TABLE "lesson"
ADD COLUMN IF NOT EXISTS "research_data" JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN "lesson"."research_data" IS 'Research-Daten aus Stage 1: facts, concepts, examples, keyTakeaways';

-- Beispiel-Struktur:
-- {
--   "topic": "React Hooks",
--   "facts": ["useState manages component state", "useEffect handles side effects"],
--   "concepts": [
--     {
--       "name": "State Hook",
--       "description": "Manages local component state",
--       "relationships": ["Connected to React re-rendering"]
--     }
--   ],
--   "examples": ["Counter with useState", "API call with useEffect"],
--   "keyTakeaways": ["Hooks replace class components", "Rules of Hooks must be followed"]
-- }

-- ============================================
-- 2. LESSON_SCORE TABLE: Füge metadata hinzu
-- ============================================
-- Speichert Dialog-Conversation-History und zusätzlichen Context
-- Wird für Story/Quiz-Generierung verwendet

ALTER TABLE "lesson_score"
ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN "lesson_score"."metadata" IS 'Dialog-History + zusätzlicher Context für Story/Quiz-Personalisierung';

-- Beispiel-Struktur:
-- {
--   "conversationHistory": [
--     { "role": "assistant", "content": "Was weißt du über React Hooks?" },
--     { "role": "user", "content": "Ich habe schon useState verwendet." }
--   ],
--   "knowledgeLevel": "intermediate",
--   "assessmentReasoning": "User hat Grundkenntnisse, aber noch nicht alle Hooks verwendet",
--   "storyPreferences": {
--     "preferredMetaphors": ["code examples", "visual diagrams"],
--     "weakPoints": ["useEffect dependencies", "custom hooks"]
--   }
-- }

-- ============================================
-- 3. INDEX für Performance
-- ============================================
-- GIN-Index für schnelle JSONB-Queries (falls benötigt)

CREATE INDEX IF NOT EXISTS idx_lesson_research_data
ON "lesson" USING GIN ("research_data");

CREATE INDEX IF NOT EXISTS idx_lesson_score_metadata
ON "lesson_score" USING GIN ("metadata");

-- ============================================
-- 4. VALIDATION CHECKS (Optional)
-- ============================================
-- Prüft, ob research_data valide JSON ist

ALTER TABLE "lesson"
ADD CONSTRAINT check_research_data_is_json
CHECK (jsonb_typeof(research_data) = 'object');

ALTER TABLE "lesson_score"
ADD CONSTRAINT check_metadata_is_json
CHECK (jsonb_typeof(metadata) = 'object');
