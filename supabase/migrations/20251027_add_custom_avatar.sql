-- Custom Avatar Migration
-- Adds custom_avatar_config and custom_avatar_url columns to user table

-- Idempotent Migration (kann mehrfach ausgeführt werden)
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS custom_avatar_config JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT DEFAULT NULL;

-- Optional: Check Constraint für JSONB-Struktur
-- Validierung erfolgt über Zod auf Client/Server-Seite
-- JSONB erlaubt flexible Struktur für DiceBear-Parameter

-- Index für Performance (wenn viele Avatare abgefragt werden)
CREATE INDEX IF NOT EXISTS idx_user_custom_avatar_config
ON "user"(custom_avatar_config)
WHERE custom_avatar_config IS NOT NULL;
