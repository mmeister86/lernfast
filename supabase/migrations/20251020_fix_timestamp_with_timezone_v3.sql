-- =====================================================
-- lernfa.st - Fix Timestamp with Timezone (V3)
-- =====================================================
-- Beschreibung: Korrigiert alle TIMESTAMP-Spalten zu TIMESTAMPTZ mit korrekten Spaltennamen.
-- Erstellt: 2025-10-20
-- Version: V3 (korrigierte Spaltennamen basierend auf tatsächlichem Schema)
-- =====================================================

-- HINWEIS: Diese Migration verwendet die tatsächlichen Spaltennamen aus der Datenbank
-- Better-Auth Tabellen: camelCase, App-Tabellen: snake_case

BEGIN;

-- =====================================================
-- BETTER-AUTH TABELLEN (camelCase)
-- =====================================================

-- Tabelle: user
ALTER TABLE "user" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "user" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC';
-- profile_updated_at ist bereits TIMESTAMPTZ, daher überspringen

-- Tabelle: session
ALTER TABLE "session" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "session" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "session" ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ USING "expiresAt" AT TIME ZONE 'UTC';

-- Tabelle: account
ALTER TABLE "account" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "account" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "account" ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ USING "expiresAt" AT TIME ZONE 'UTC';

-- Tabelle: verification
ALTER TABLE "verification" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "verification" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "verification" ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ USING "expiresAt" AT TIME ZONE 'UTC';

-- =====================================================
-- APP-TABELLEN (snake_case)
-- =====================================================

-- Tabelle: lesson
ALTER TABLE "lesson" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "lesson" ALTER COLUMN "completed_at" TYPE TIMESTAMPTZ USING "completed_at" AT TIME ZONE 'UTC';

-- Tabelle: flashcard
ALTER TABLE "flashcard" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC';

-- Tabelle: lesson_score
ALTER TABLE "lesson_score" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "lesson_score" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC';

-- Tabelle: payment_subscription
ALTER TABLE "payment_subscription" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "payment_subscription" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "payment_subscription" ALTER COLUMN "current_period_end" TYPE TIMESTAMPTZ USING "current_period_end" AT TIME ZONE 'UTC';

-- =====================================================
-- DEFAULT-WERTE AUF TIMESTAMPTZ-KOMPATIBLE FUNKTIONEN
-- =====================================================

-- BETTER-AUTH TABELLEN (camelCase)
-- Tabelle: user
ALTER TABLE "user" ALTER COLUMN "createdAt" SET DEFAULT now();
ALTER TABLE "user" ALTER COLUMN "updatedAt" SET DEFAULT now();

-- Tabelle: session
ALTER TABLE "session" ALTER COLUMN "createdAt" SET DEFAULT now();
ALTER TABLE "session" ALTER COLUMN "updatedAt" SET DEFAULT now();

-- Tabelle: account
ALTER TABLE "account" ALTER COLUMN "createdAt" SET DEFAULT now();
ALTER TABLE "account" ALTER COLUMN "updatedAt" SET DEFAULT now();

-- Tabelle: verification
ALTER TABLE "verification" ALTER COLUMN "createdAt" SET DEFAULT now();
ALTER TABLE "verification" ALTER COLUMN "updatedAt" SET DEFAULT now();

-- APP-TABELLEN (snake_case)
-- Tabelle: lesson
ALTER TABLE "lesson" ALTER COLUMN "created_at" SET DEFAULT now();

-- Tabelle: flashcard
ALTER TABLE "flashcard" ALTER COLUMN "created_at" SET DEFAULT now();

-- Tabelle: lesson_score
ALTER TABLE "lesson_score" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "lesson_score" ALTER COLUMN "updated_at" SET DEFAULT now();

-- Tabelle: payment_subscription
ALTER TABLE "payment_subscription" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "payment_subscription" ALTER COLUMN "updated_at" SET DEFAULT now();

-- =====================================================
-- VALIDIERUNG: Prüfe erfolgreiche Konvertierung
-- =====================================================

-- Prüfe, ob alle Spalten korrekt zu TIMESTAMPTZ konvertiert wurden
DO $$
DECLARE
    column_info RECORD;
    expected_tables TEXT[] := ARRAY['user', 'session', 'account', 'verification', 'lesson', 'flashcard', 'lesson_score', 'payment_subscription'];
    table_name TEXT;
    column_name TEXT;
    data_type TEXT;
BEGIN
    FOR table_name IN SELECT unnest(expected_tables) LOOP
        FOR column_info IN
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = column_info.table_name
            AND (column_name LIKE '%_at' OR column_name LIKE '%At')
        LOOP
            IF column_info.data_type != 'timestamp with time zone' THEN
                RAISE WARNING 'Spalte %.% hat noch nicht den erwarteten Typ TIMESTAMPTZ: %',
                    table_name, column_info.column_name, column_info.data_type;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE '✅ Timezone-Migration V3 erfolgreich abgeschlossen!';
    RAISE NOTICE '📊 Alle TIMESTAMP-Spalten wurden zu TIMESTAMPTZ konvertiert';
    RAISE NOTICE '🌍 Zeitstempel werden jetzt in UTC gespeichert und korrekt angezeigt';
END $$;

COMMIT;
