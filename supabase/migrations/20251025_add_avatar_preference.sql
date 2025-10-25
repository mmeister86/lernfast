-- Avatar Preferences Migration
-- Adds avatar_preference column to user table with validation

-- Idempotent Migration (kann mehrfach ausgeführt werden)
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS avatar_preference VARCHAR(20) DEFAULT 'hanne';

-- Check Constraint für Validierung der erlaubten Werte
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avatar_preference_valid'
  ) THEN
    ALTER TABLE "user"
    ADD CONSTRAINT avatar_preference_valid
    CHECK (avatar_preference IN ('hanne', 'lena', 'mai', 'naomi', 'niklas', 'tariq'));
  END IF;
END $$;
