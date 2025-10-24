-- Migration: Dialog-Persistierung für Interactive Learning
-- Datum: 2025-10-24
-- Zweck: Ermöglicht Wiederaufnahme von Dialog-Conversations nach Page-Reload

-- Füge dialog_history Spalte zu lesson Tabelle hinzu
ALTER TABLE lesson
  ADD COLUMN dialog_history JSONB DEFAULT '[]'::jsonb;

-- Index für schnellere Abfragen
CREATE INDEX idx_lesson_dialog_history
  ON lesson USING GIN (dialog_history);

-- Kommentar
COMMENT ON COLUMN lesson.dialog_history IS
  'Persistierte Dialog-Conversation zwischen User und KI.
   Format: [{ role: "user" | "assistant", content: string, timestamp: string }]
   Ermöglicht Wiederaufnahme nach Page-Reload.';

-- Update bestehende Lessons (setze leeres Array für alte Lessons)
UPDATE lesson
SET dialog_history = '[]'::jsonb
WHERE dialog_history IS NULL;
