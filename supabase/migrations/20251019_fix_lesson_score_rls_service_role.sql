-- ============================================
-- Migration: Fix RLS für Service Role auf lesson_score
-- Date: 2025-10-19
-- Issue: Service Role Client wird durch RLS blockiert
--
-- Problem:
-- - saveDialogMetadata() versucht UPSERT mit Service Role
-- - RLS Policy prüft auth.uid() = user_id
-- - Service Role hat keinen auth.uid() Context → fetch failed
--
-- Lösung:
-- - Neue Policy für service_role Rolle (bypassed RLS automatisch)
-- - Explizite Permissions für Service Role Operations
-- ============================================

-- ✅ Policy 1: Service Role kann ALLE lesson_score Einträge lesen
-- Wird für Background-Jobs, Analytics, Aggregationen verwendet
CREATE POLICY "Service role can read all lesson scores"
  ON "lesson_score"
  FOR SELECT
  TO service_role
  USING (true);

-- ✅ Policy 2: Service Role kann ALLE lesson_score Einträge erstellen
-- Wird für Server Actions (Dialog, Story, Quiz) verwendet
CREATE POLICY "Service role can insert all lesson scores"
  ON "lesson_score"
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ✅ Policy 3: Service Role kann ALLE lesson_score Einträge updaten
-- Wird für Metadata-Updates, Score-Updates verwendet
CREATE POLICY "Service role can update all lesson scores"
  ON "lesson_score"
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ✅ Policy 4: Service Role kann ALLE lesson_score Einträge löschen
-- Wird für Cleanup-Jobs, Admin-Operations verwendet
CREATE POLICY "Service role can delete all lesson scores"
  ON "lesson_score"
  FOR DELETE
  TO service_role
  USING (true);

-- ============================================
-- WICHTIG: User-Policies bleiben unverändert!
-- - Users können nur ihre eigenen Scores lesen/ändern
-- - RLS schützt weiterhin User-Daten vor Cross-User Access
-- - Service Role wird nur server-side in trusted Code verwendet
-- ============================================

-- Verifiziere, dass alle Policies aktiv sind
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'lesson_score'
ORDER BY policyname;
