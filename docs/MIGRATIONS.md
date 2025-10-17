# MIGRATIONS.md - Datenbank-Migrationen für lernfa.st

> **⚠️ WICHTIG:** Der `/supabase/migrations/` Ordner ist aktuell leer. Alle Schema-Änderungen wurden manuell in Supabase durchgeführt. Dieses Dokument dokumentiert alle bisherigen Schema-Änderungen für zukünftige Reproduzierbarkeit.

## Übersicht

Dieses Dokument enthält alle SQL-Statements, die auf der Supabase-Datenbank ausgeführt wurden, in chronologischer Reihenfolge. Für eine vollständige Neuinstallation sollten diese Migrationen der Reihe nach ausgeführt werden.

---

## Migration 1: Better-Auth Tabellen (Phase 0)

**Datum:** 2025-10-10 (geschätzt)
**Zweck:** Erstelle Better-Auth Tabellen für Authentifizierung

```sql
-- Tabelle: user
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  normalizedEmail TEXT UNIQUE, -- Von better-auth-harmony verwaltet
  name TEXT,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Profile-Felder
  age INT,
  language TEXT DEFAULT 'de',
  learningGoals TEXT,
  experienceLevel TEXT DEFAULT 'beginner',
  preferredDifficulty TEXT DEFAULT 'medium',
  preferredCardCount INT DEFAULT 5,
  onboardingCompleted BOOLEAN DEFAULT FALSE,
  profileUpdatedAt TIMESTAMP
);

-- Tabelle: session
CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  token TEXT UNIQUE NOT NULL, -- Manuell hinzugefügt (bessere-auth CLI fehlt)
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabelle: account
CREATE TABLE IF NOT EXISTS "account" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL, -- 'credential' | 'magic-link'
  password TEXT,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider_id, account_id)
);

-- Tabelle: verification
CREATE TABLE IF NOT EXISTS "verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session"(user_id);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account"(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON "verification"(identifier);

-- WICHTIG: Keine RLS Policies für Better-Auth Tabellen
-- Better-Auth greift direkt via PostgreSQL (pg.Pool) zu, nicht über Supabase API
```

---

## Migration 2: App-Tabellen (Phase 1 MVP)

**Datum:** 2025-10-11 (geschätzt)
**Zweck:** Erstelle App-Tabellen für Lessons und Flashcards

```sql
-- Tabelle: lesson
CREATE TABLE IF NOT EXISTS lesson (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  lesson_type TEXT NOT NULL CHECK (lesson_type IN ('micro_dose', 'deep_dive')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Tabelle: flashcard
CREATE TABLE IF NOT EXISTS flashcard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  thesys_json JSONB, -- LEGACY: Strukturierter JSON-Output
  visualizations JSONB DEFAULT '[]'::jsonb, -- Array von D3.js-Visualisierungen
  is_learned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabelle: payment_subscription (Phase 2 - vorbereitet)
CREATE TABLE IF NOT EXISTS payment_subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due')),
  plan_type TEXT CHECK (plan_type IN ('premium_monthly', 'premium_yearly')),
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies aktivieren
ALTER TABLE lesson ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_subscription ENABLE ROW LEVEL SECURITY;

-- RLS Policy: User kann nur eigene Lessons sehen
CREATE POLICY "Users can view own lessons"
  ON lesson FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create own lessons"
  ON lesson FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete own lessons"
  ON lesson FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policy: User kann nur Flashcards eigener Lessons sehen
CREATE POLICY "Users can view own flashcards"
  ON flashcard FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lesson
      WHERE lesson.id = flashcard.lesson_id
      AND lesson.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Indizes
CREATE INDEX IF NOT EXISTS idx_lesson_user_id ON lesson(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_status ON lesson(status);
CREATE INDEX IF NOT EXISTS idx_flashcard_lesson_id ON flashcard(lesson_id);
```

---

## Migration 3: Interactive Learning Erweiterungen

**Datum:** 2025-10-12 (geschätzt)
**Zweck:** Erweitere Schema für Interactive Learning System

```sql
-- Erweitere lesson Tabelle
ALTER TABLE lesson
  ADD COLUMN IF NOT EXISTS refined_topic TEXT,
  ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'dialog'
    CHECK (current_phase IN ('dialog', 'story', 'quiz', 'completed'));

-- Erweitere flashcard Tabelle
ALTER TABLE flashcard
  ADD COLUMN IF NOT EXISTS answer TEXT, -- Explanatory text (150-300 Wörter)
  ADD COLUMN IF NOT EXISTS learning_content JSONB DEFAULT '{}'::jsonb, -- Story/Quiz Daten
  ADD COLUMN IF NOT EXISTS phase TEXT CHECK (phase IN ('dialog', 'story', 'quiz')),
  ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;

-- Neue Tabelle: lesson_score
CREATE TABLE IF NOT EXISTS lesson_score (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  dialog_score INT DEFAULT 0 CHECK (dialog_score >= 0 AND dialog_score <= 100),
  story_engagement_score INT DEFAULT 0 CHECK (story_engagement_score >= 0 AND story_engagement_score <= 100),
  quiz_score INT DEFAULT 0 CHECK (quiz_score >= 0 AND quiz_score <= 100),
  total_score INT DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),
  correct_answers INT DEFAULT 0,
  total_questions INT DEFAULT 0,
  time_spent_seconds INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lesson_id, user_id)
);

-- RLS für lesson_score
ALTER TABLE lesson_score ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scores"
  ON lesson_score FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own scores"
  ON lesson_score FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own scores"
  ON lesson_score FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Indizes
CREATE INDEX IF NOT EXISTS idx_lesson_score_lesson_id ON lesson_score(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_score_user_id ON lesson_score(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_phase ON flashcard(phase);
CREATE INDEX IF NOT EXISTS idx_lesson_current_phase ON lesson(current_phase);
```

---

## Migration 4: Score-Berechnung Trigger (V1.2)

**Datum:** 2025-10-16
**Zweck:** Automatische total_score Berechnung (vereinfacht: total_score = quiz_score)

```sql
-- Trigger-Funktion: Berechne total_score automatisch
CREATE OR REPLACE FUNCTION update_lesson_total_score()
RETURNS TRIGGER AS $$
BEGIN
  -- V1.2: Vereinfachte Berechnung (nur Quiz zählt)
  NEW.total_score := NEW.quiz_score;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Führe Funktion vor INSERT/UPDATE aus
CREATE TRIGGER trigger_update_total_score
BEFORE INSERT OR UPDATE ON lesson_score
FOR EACH ROW
EXECUTE FUNCTION update_lesson_total_score();

-- Update existing scores (falls vorhanden)
UPDATE lesson_score
SET total_score = quiz_score;
```

**Hinweis:** Die alte Formel (V1.1) war:
```sql
-- ALT (V1.1 - nicht mehr verwendet):
-- NEW.total_score := ROUND((NEW.dialog_score * 0.2) + (NEW.quiz_score * 0.8));
```

---

## Migration 5: Indizes für Performance-Optimierung (Phase 1.5)

**Datum:** 2025-10-12
**Zweck:** Verbessere Query-Performance für gecachte Queries

```sql
-- Composite Index für häufige Queries
CREATE INDEX IF NOT EXISTS idx_lesson_user_status ON lesson(user_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_user_created ON lesson(user_id, created_at DESC);

-- Index für Flashcard-Abfragen mit Phase
CREATE INDEX IF NOT EXISTS idx_flashcard_lesson_phase ON flashcard(lesson_id, phase);
CREATE INDEX IF NOT EXISTS idx_flashcard_lesson_order ON flashcard(lesson_id, order_index);

-- Index für Score-Lookups
CREATE INDEX IF NOT EXISTS idx_lesson_score_lookup ON lesson_score(lesson_id, user_id);
```

---

## Vollständiger Re-Setup (Neuinstallation)

Um die Datenbank von Grund auf neu zu erstellen:

```bash
# 1. Führe alle Migrationen in chronologischer Reihenfolge aus
psql $DATABASE_URL -f migrations/01_better_auth_tables.sql
psql $DATABASE_URL -f migrations/02_app_tables.sql
psql $DATABASE_URL -f migrations/03_interactive_learning.sql
psql $DATABASE_URL -f migrations/04_score_calculation_trigger.sql
psql $DATABASE_URL -f migrations/05_performance_indexes.sql

# 2. Verifiziere Schema
psql $DATABASE_URL -c "\dt" # Zeige alle Tabellen
psql $DATABASE_URL -c "\d lesson" # Zeige lesson Schema
psql $DATABASE_URL -c "\d lesson_score" # Zeige lesson_score Schema
```

---

## Verifikations-Query

Um zu prüfen, ob alle Tabellen und Spalten korrekt erstellt wurden:

```sql
-- Prüfe alle Tabellen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Erwartete Ausgabe:
-- account
-- flashcard
-- lesson
-- lesson_score
-- payment_subscription
-- session
-- user
-- verification

-- Prüfe lesson_score Spalten
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'lesson_score'
ORDER BY ordinal_position;

-- Prüfe Trigger-Funktion
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'update_lesson_total_score';

-- Prüfe Trigger
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_update_total_score';
```

---

## Bekannte Probleme & Todos

### ⚠️ Keine Versionskontrolle

**Problem:** Alle Migrationen wurden manuell in Supabase durchgeführt, keine `.sql` Dateien in `/supabase/migrations/`

**Auswirkung:**
- Schwierig, Schema in anderen Environments zu reproduzieren
- Kein Rollback bei Fehlern möglich
- Team-Members müssen manuell synchronisieren

**Lösung (geplant):**
1. Erstelle `.sql` Dateien für alle bisherigen Migrationen
2. Nutze `supabase db push` für zukünftige Schema-Änderungen
3. Implementiere Migration-Workflow in CI/CD

### 🔧 Fehlende Migrations-Dateien

Folgende Dateien sollten erstellt werden:

```
supabase/migrations/
├── 20251010000000_better_auth_tables.sql
├── 20251011000000_app_tables.sql
├── 20251012000000_interactive_learning.sql
├── 20251016000000_score_calculation_trigger.sql
└── 20251012000001_performance_indexes.sql
```

---

## Nächste Schritte

1. **Erstelle SQL-Dateien:** Kopiere SQL-Statements aus diesem Dokument in separate `.sql` Dateien
2. **Test in Dev-Environment:** Erstelle neue Supabase-Instanz und teste alle Migrationen
3. **Dokumentiere Rollback-Strategien:** Erstelle `down.sql` Migrations für Rollbacks
4. **Automatisiere mit CI/CD:** Integriere Migrations in GitHub Actions

---

**Letzte Aktualisierung:** 2025-10-16
**Status:** 📄 Dokumentation abgeschlossen | ⚠️ SQL-Dateien fehlen noch
**Siehe auch:** [CLAUDE.md](./CLAUDE.md) für Gesamt-Überblick über die Codebase
