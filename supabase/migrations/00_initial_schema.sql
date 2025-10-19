-- =====================================================
-- lernfa.st - Initial Database Schema
-- =====================================================
-- Beschreibung: Komplettes Datenbank-Schema für lernfa.st
-- Erstellt: 2025-10-19
-- Version: 1.2.1 (Interactive Learning + Legacy Flashcards)
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- BETTER-AUTH TABELLEN
-- =====================================================

-- Tabelle: user
-- Zweck: Zentrale User-Verwaltung + Profile-Daten
CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    normalized_email TEXT UNIQUE, -- Von better-auth-harmony verwaltet
    name TEXT,
    image TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Profile-Daten (erweiterte Felder)
    age INTEGER,
    language TEXT DEFAULT 'de',
    learning_goals TEXT,
    experience_level TEXT DEFAULT 'beginner',
    preferred_difficulty TEXT DEFAULT 'medium',
    preferred_card_count INTEGER DEFAULT 5,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    profile_updated_at TIMESTAMP
);

-- Tabelle: session
-- Zweck: Session-Management für Better-Auth
CREATE TABLE IF NOT EXISTS "session" (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabelle: account
-- Zweck: OAuth-Provider + Credential-Accounts
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
-- Zweck: Magic Link Tokens + Email Verification
CREATE TABLE IF NOT EXISTS "verification" (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- APP-TABELLEN
-- =====================================================

-- Tabelle: lesson
-- Zweck: Lerneinheiten (Interactive Learning + Legacy)
CREATE TABLE IF NOT EXISTS "lesson" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    refined_topic TEXT, -- Verfeinertes Topic vom Topic Suggestion System
    lesson_type TEXT NOT NULL CHECK (lesson_type IN ('micro_dose', 'deep_dive')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    current_phase TEXT CHECK (current_phase IN ('dialog', 'story', 'quiz', 'completed')), -- NULL = Legacy Flashcards
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Tabelle: flashcard
-- Zweck: Lernkarten (Hybrid: Interactive Learning + Legacy Flashcards)
CREATE TABLE IF NOT EXISTS "flashcard" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES "lesson"(id) ON DELETE CASCADE,

    -- LEGACY: Flashcard-System (alte Lessons)
    question TEXT, -- LEGACY: Flashcard-Frage
    thesys_json JSONB, -- LEGACY: Strukturierter JSON-Output (sehr alte Lessons)
    visualizations JSONB DEFAULT '[]'::jsonb, -- DEPRECATED: D3.js-Visualisierungen wurden entfernt (2025-10-19)

    -- INTERACTIVE LEARNING: Story + Quiz
    answer TEXT, -- Explanatory text (150-300 Wörter)
    learning_content JSONB DEFAULT '{}'::jsonb, -- Story-Kapitel oder Quiz-Fragen
    phase TEXT CHECK (phase IN ('dialog', 'story', 'quiz')), -- Zu welcher Phase gehört diese Karte?
    order_index INTEGER DEFAULT 0, -- Reihenfolge der Kapitel/Fragen

    -- Gemeinsam
    is_learned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabelle: lesson_score
-- Zweck: Score-Tracking für Interactive Learning
CREATE TABLE IF NOT EXISTS "lesson_score" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES "lesson"(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

    -- Score-Komponenten
    dialog_score INTEGER DEFAULT 0, -- Knowledge Assessment Score (0-100, nicht gewertet)
    story_engagement_score INTEGER DEFAULT 0, -- Story-Engagement (0-100, informativ)
    quiz_score INTEGER DEFAULT 0, -- Quiz Score (0-100, einziger gewerteter Score)
    total_score INTEGER DEFAULT 0, -- Auto-berechnet: total_score = quiz_score (V1.2)

    -- Statistiken
    correct_answers INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(lesson_id, user_id)
);

-- Tabelle: payment_subscription
-- Zweck: Stripe-Integration für Premium-Abos (Phase 2 - noch nicht aktiv)
CREATE TABLE IF NOT EXISTS "payment_subscription" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT CHECK (status IN ('active', 'canceled', 'past_due')),
    plan_type TEXT CHECK (plan_type IN ('premium_monthly', 'premium_yearly')),
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TRIGGER: Auto-Update total_score (V1.2)
-- =====================================================

CREATE OR REPLACE FUNCTION update_lesson_total_score()
RETURNS TRIGGER AS $$
BEGIN
    -- V1.2: total_score = quiz_score (vereinfachte Berechnung)
    NEW.total_score := NEW.quiz_score;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_total_score
BEFORE INSERT OR UPDATE ON lesson_score
FOR EACH ROW
EXECUTE FUNCTION update_lesson_total_score();

-- =====================================================
-- TRIGGER: Auto-Update updated_at timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at column
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_updated_at BEFORE UPDATE ON "session"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_updated_at BEFORE UPDATE ON "account"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_score_updated_at BEFORE UPDATE ON "lesson_score"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INDEXES für Performance-Optimierung
-- =====================================================

-- User-Tabelle
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_normalized_email ON "user"(normalized_email);

-- Session-Tabelle
CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session"(user_id);
CREATE INDEX IF NOT EXISTS idx_session_token ON "session"(token);
CREATE INDEX IF NOT EXISTS idx_session_expires_at ON "session"(expires_at);

-- Account-Tabelle
CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account"(user_id);
CREATE INDEX IF NOT EXISTS idx_account_provider_id ON "account"(provider_id, account_id);

-- Verification-Tabelle
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON "verification"(identifier);
CREATE INDEX IF NOT EXISTS idx_verification_expires_at ON "verification"(expires_at);

-- Lesson-Tabelle
CREATE INDEX IF NOT EXISTS idx_lesson_user_id ON "lesson"(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_status ON "lesson"(status);
CREATE INDEX IF NOT EXISTS idx_lesson_current_phase ON "lesson"(current_phase);
CREATE INDEX IF NOT EXISTS idx_lesson_created_at ON "lesson"(created_at DESC);

-- Flashcard-Tabelle
CREATE INDEX IF NOT EXISTS idx_flashcard_lesson_id ON "flashcard"(lesson_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_phase ON "flashcard"(phase);
CREATE INDEX IF NOT EXISTS idx_flashcard_order_index ON "flashcard"(lesson_id, order_index);

-- Lesson-Score-Tabelle
CREATE INDEX IF NOT EXISTS idx_lesson_score_lesson_id ON "lesson_score"(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_score_user_id ON "lesson_score"(user_id);

-- Payment-Subscription-Tabelle
CREATE INDEX IF NOT EXISTS idx_payment_subscription_user_id ON "payment_subscription"(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_subscription_stripe_customer_id ON "payment_subscription"(stripe_customer_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- WICHTIG: Better-Auth Tabellen haben KEIN RLS (direkte PostgreSQL-Verbindung)
-- RLS nur für App-Tabellen!

-- Aktiviere RLS für App-Tabellen
ALTER TABLE "lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flashcard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lesson_score" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_subscription" ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: lesson
-- =====================================================

-- Users können nur ihre eigenen Lessons sehen
CREATE POLICY "Users can view own lessons"
ON "lesson"
FOR SELECT
USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users können nur ihre eigenen Lessons erstellen
CREATE POLICY "Users can create own lessons"
ON "lesson"
FOR INSERT
WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users können nur ihre eigenen Lessons updaten
CREATE POLICY "Users can update own lessons"
ON "lesson"
FOR UPDATE
USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users können nur ihre eigenen Lessons löschen
CREATE POLICY "Users can delete own lessons"
ON "lesson"
FOR DELETE
USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- =====================================================
-- RLS POLICIES: flashcard
-- =====================================================

-- Users können nur Flashcards ihrer eigenen Lessons sehen
CREATE POLICY "Users can view own flashcards"
ON "flashcard"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "lesson"
        WHERE lesson.id = flashcard.lesson_id
        AND lesson.user_id = current_setting('request.jwt.claims')::json->>'sub'
    )
);

-- Users können nur Flashcards für ihre eigenen Lessons erstellen
CREATE POLICY "Users can create own flashcards"
ON "flashcard"
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "lesson"
        WHERE lesson.id = flashcard.lesson_id
        AND lesson.user_id = current_setting('request.jwt.claims')::json->>'sub'
    )
);

-- Users können nur Flashcards ihrer eigenen Lessons updaten
CREATE POLICY "Users can update own flashcards"
ON "flashcard"
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM "lesson"
        WHERE lesson.id = flashcard.lesson_id
        AND lesson.user_id = current_setting('request.jwt.claims')::json->>'sub'
    )
);

-- Users können nur Flashcards ihrer eigenen Lessons löschen
CREATE POLICY "Users can delete own flashcards"
ON "flashcard"
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM "lesson"
        WHERE lesson.id = flashcard.lesson_id
        AND lesson.user_id = current_setting('request.jwt.claims')::json->>'sub'
    )
);

-- =====================================================
-- RLS POLICIES: lesson_score
-- =====================================================

-- Users können nur ihre eigenen Scores sehen
CREATE POLICY "Users can view own scores"
ON "lesson_score"
FOR SELECT
USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users können nur ihre eigenen Scores erstellen
CREATE POLICY "Users can create own scores"
ON "lesson_score"
FOR INSERT
WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users können nur ihre eigenen Scores updaten
CREATE POLICY "Users can update own scores"
ON "lesson_score"
FOR UPDATE
USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- =====================================================
-- RLS POLICIES: payment_subscription
-- =====================================================

-- Users können nur ihre eigenen Subscriptions sehen
CREATE POLICY "Users can view own subscriptions"
ON "payment_subscription"
FOR SELECT
USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users können nur ihre eigenen Subscriptions erstellen
CREATE POLICY "Users can create own subscriptions"
ON "payment_subscription"
FOR INSERT
WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users können nur ihre eigenen Subscriptions updaten
CREATE POLICY "Users can update own subscriptions"
ON "payment_subscription"
FOR UPDATE
USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- =====================================================
-- SERVICE ROLE BYPASS (für Better-Auth & Backend)
-- =====================================================

-- Hinweis: Supabase Service Role umgeht automatisch RLS
-- Kein explizites Policy-Handling nötig

-- =====================================================
-- CLEANUP: Alte Sessions & Verifications
-- =====================================================

-- Optional: Automatisches Löschen abgelaufener Tokens via Cron
-- Kann via Supabase Dashboard oder pg_cron aktiviert werden

-- Beispiel (manuell via SQL Editor ausführen):
-- DELETE FROM "session" WHERE expires_at < NOW();
-- DELETE FROM "verification" WHERE expires_at < NOW();

-- =====================================================
-- SCHEMA VERSION TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS "schema_version" (
    version TEXT PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO "schema_version" (version, description)
VALUES ('1.2.1', 'Initial schema - Interactive Learning + Legacy Flashcards + Robust Visualization Validation');

-- =====================================================
-- ENDE DES INITIAL SCHEMA
-- =====================================================

-- Überprüfung der erstellten Tabellen
DO $$
BEGIN
    RAISE NOTICE '✅ Schema erfolgreich erstellt!';
    RAISE NOTICE '📊 Better-Auth Tabellen: user, session, account, verification';
    RAISE NOTICE '📚 App-Tabellen: lesson, flashcard, lesson_score, payment_subscription';
    RAISE NOTICE '🔒 RLS Policies aktiviert für App-Tabellen';
    RAISE NOTICE '⚡ Trigger für auto-update timestamps aktiviert';
    RAISE NOTICE '📈 Performance-Indexes erstellt';
END $$;
