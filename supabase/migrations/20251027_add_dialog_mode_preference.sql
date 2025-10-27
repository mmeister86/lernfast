-- Dialog Mode Preference Migration
-- Adds dialog_mode column to user table with validation
-- User can choose between 'text' (default) or 'voice' for dialog phase

-- Idempotent Migration (kann mehrfach ausgeführt werden)
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS dialog_mode VARCHAR(10) DEFAULT 'text';

-- Check Constraint für Validierung der erlaubten Werte
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dialog_mode_valid'
  ) THEN
    ALTER TABLE "user"
    ADD CONSTRAINT dialog_mode_valid
    CHECK (dialog_mode IN ('text', 'voice'));
  END IF;
END $$;
