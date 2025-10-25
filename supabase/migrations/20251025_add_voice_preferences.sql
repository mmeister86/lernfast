-- Voice Preferences Migration
-- Adds tts_voice column to user table with validation

-- Idempotent Migration (kann mehrfach ausgeführt werden)
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS tts_voice VARCHAR(20) DEFAULT 'nova';

-- Check Constraint für Validierung der erlaubten Werte
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tts_voice_valid'
  ) THEN
    ALTER TABLE "user"
    ADD CONSTRAINT tts_voice_valid
    CHECK (tts_voice IN ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'));
  END IF;
END $$;
