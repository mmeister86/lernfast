# CLAUDE.md - Projekt-Kontext für lernfa.st

> **Hinweis:** Für spezialisierte Features siehe:
>
> - **[INTERACTIVE-LEARNING.md](./INTERACTIVE-LEARNING.md)** - 3-Phasen-Lernsystem (Dialog → Story → Quiz)
> - **[MIGRATIONS.md](./MIGRATIONS.md)** - Datenbank-Migrationen _(geplant)_

## Projektübersicht

**lernfa.st** transformiert komplexe Themen in ein **interaktives 3-Phasen-Lernerlebnis**:

- **Dialog** (Knowledge Assessment) → **Story** (Visual Learning) → **Quiz** (Adaptive Testing)
- KI-generierte Inhalte mit Recharts-Visualisierungen
- Neobrutalismus-Design
- Freemium: Micro-Dose (3-5 Kapitel) vs Deep Dive (10+ Kapitel, Premium)
- Legacy-Support für alte Flashcards

**Zielgruppe:** Entwickler/Berufstätige (Primär), Schüler (Sekundär)

---

## Tech Stack

### Frontend

- Next.js 15 (App Router) + React 19 + TypeScript 5
- Tailwind CSS (Neobrutalismus-Theme)
- Recharts 3.2.1 (Timeline, Comparison, Process, Concept-Map)
- Framer Motion 12.23+ (Animationen)
- Vercel AI SDK v5 (`streamUI` für Dialog-Phase)

### Backend

| Service                 | Zweck                                    | Status     |
| ----------------------- | ---------------------------------------- | ---------- |
| **Supabase**            | PostgreSQL + Storage                     | ✅         |
| **Better-Auth**         | Auth (Email/Password + Magic Link)       | ✅         |
| **Better-Auth-Harmony** | Email-Validierung (55k+ Wegwerf-Domains) | ✅         |
| **Unsend**              | Transaktionale E-Mails                   | ✅         |
| **OpenAI**              | 4 Models (Dialog/Story/Quiz/Topics)      | ✅         |
| **LemonSqueezy**        | Zahlungen                                | ❌ Phase 2 |
| **Upstash Redis**       | Rate Limiting                            | ❌ Phase 2 |

---

## Datenbank-Schema

### Better-Auth Tabellen

```sql
user: id, email, normalizedEmail, name, image, age, language, learningGoals, experienceLevel, ...
session: id, user_id, expires_at, token, ip_address, user_agent
account: id, user_id, account_id, provider_id, password
verification: id, identifier, value, expires_at
```

### Wichtige Hinweise

- **Zeitstempel**: Alle `created_at`, `updated_at`, `expires_at` Spalten verwenden `TIMESTAMPTZ` (mit Zeitzone)
- **Zeitzone**: Datenbank speichert in UTC, Client konvertiert zur lokalen Zeit
- **Migration**: `20251020_fix_timestamp_with_timezone_v2.sql` behebt Zeitzonenprobleme im Dashboard

### App-Tabellen

```sql
-- Lerneinheit
lesson: id, user_id, topic, refined_topic, lesson_type, status, current_phase, created_at

-- Flashcards (Hybrid: Interactive Learning + Legacy)
flashcard: id, lesson_id, question, answer, learning_content, phase, order_index, is_learned

-- Score-System (V1.2: total_score = quiz_score)
lesson_score: id, lesson_id, user_id, dialog_score, quiz_score, total_score, correct_answers, ...

-- Zahlungen (Phase 2)
payment_subscription: id, user_id, lemon_squeezy_customer_id, lemon_squeezy_order_id, status, plan_type, variant_id
```

**Wichtige `learning_content` Strukturen:**

```json
// Story-Kapitel (phase='story')
{ "chapterNumber": 1, "title": "...", "content": "...",
  "visualization": { "type": "timeline", "data": [...] } }

// Quiz-Frage (phase='quiz')
{ "questionText": "...", "options": [...], "explanation": "...", "difficulty": "medium" }
```

---

## Projektstruktur (Auszug)

```
app/
├── api/
│   ├── trigger-lesson/          # KI-Generierung (Dialog + Story + Quiz)
│   ├── suggest-topics/          # Topic-Vorschläge (3 Optionen)
│   └── lesson/
│       ├── update-phase/        # Phase-Wechsel
│       └── update-score/        # Score-Update
├── lesson/[id]/
│   ├── page.tsx                 # Hybrid Viewer (Interactive + Legacy)
│   └── actions.tsx              # Server Actions (continueDialog, forceAssessment)
└── dashboard/page.tsx

components/
├── learning/                    # Interactive Learning (9 Komponenten)
│   ├── dialog-phase.tsx
│   ├── story-phase.tsx
│   ├── quiz-phase.tsx
│   └── modern-visualization.tsx # Recharts
└── flashcard/                   # Legacy Flashcards

lib/
├── auth.ts                      # Better-Auth Server
├── supabase/queries.ts          # Gecachte Queries (Phase 1.5)
├── lesson.types.ts
└── score.types.ts
```

---

## KI-Pipeline (Interactive Learning V1.3)

```
User Input → Optional: /api/suggest-topics (3 Vorschläge)
  ↓
POST /api/trigger-lesson { topic, lessonType }
  ↓
1. Auth Check
2. Create Lesson (status='pending', current_phase='dialog')
3. Light Research-Phase (2-3s statt 15s) - OPENAI_MICRO_DOSE_MODEL
4. Update status='completed' → Redirect zu /lesson/[id]
  ↓
Dialog-Phase 💬 (Max. 5 Antworten → dialog_score)
  ↓ (Parallel: Background Story Generation via /api/generate-story-background)
Story-Phase 📖 (3-5 Kapitel + Recharts) - bereits fertig!
  ↓
Quiz-Phase 🎯 (5-7 Fragen → quiz_score)
  ↓
Completion 🎉 (total_score = quiz_score)
```

### V1.3 - Performance-Optimierungen

- **Light Research**: 2-3s statt 15s Wartezeit nach Topic-Auswahl
- **Background Story Generation**: Story wird während Dialog generiert (Fire & Forget)
- **Nahtloser Übergang**: Dialog → Story ohne Wartezeit
- **Full Research**: Läuft parallel via `/api/generate-full-research`

---

## Score-System Übersicht

### V1.1 - Dialog Limit

- Max. 5 User-Antworten (Hard Limit)
- `forceAssessment()` nach 5. Frage
- Progress-Bar: Grün → Gelb → Orange

### V1.2 - Vereinfachte Berechnung

```sql
total_score = quiz_score  -- Nur Quiz zählt (0-100)
```

**Grund:** Dialog-Score war unfair (LLM konnte vorzeitig abbrechen)

### V1.2.1 - Robuste Visualisierungs-Validierung

- 3-stufige Validierung (Array/Länge/Struktur)
- Fallback-Daten für alle 4 Chart-Typen
- Debug-Logging auf 5 Ebenen

### V1.3 - Dialog-Persistierung & Personalisierung

- **Dialog-Hang-Fix**: RLS Policies für Service Role Client behoben
- **Dialog-Persistierung**: Neue Spalte `dialog_history` in lesson Tabelle
- **Personalisierung**: Basierend auf User-Profil (Alter, Erfahrungslevel, Sprache)
- **5-Fragen-Limit**: System-Prompt verschärft, Tool-Calls entfernt
- **Background Story Generation**: Fire & Forget Pattern für bessere UX

---

## Hybrid System: Interactive + Legacy

**Entscheidung:**

```typescript
const isInteractiveLearning = !!lesson.current_phase;
```

| Merkmal            | Legacy | Interactive                           |
| ------------------ | ------ | ------------------------------------- |
| `current_phase`    | `NULL` | `'dialog'/'story'/'quiz'/'completed'` |
| `flashcard.phase`  | `NULL` | `'dialog'/'story'/'quiz'`             |
| `learning_content` | `{}`   | Story/Quiz-Daten                      |
| `lesson_score`     | ❌     | ✅                                    |

---

## Server Actions (Vercel AI SDK v5)

**Datei:** `app/lesson/[id]/actions.tsx`

### 1. `continueDialog()`

- Live-Streaming (Token-by-Token)
- Tool: `assessKnowledge` → Speichert `dialog_score` + Wechsel zu Story-Phase

### 2. `forceAssessment()`

- Erzwingt Assessment nach 5 Antworten
- `maxSteps: 1` (nur ein Tool Call)

---

## Caching-Strategie (Phase 1.5)

**Performance:** 83-90% schneller (15-30s → 2-3s Initial-Ladezeit)

```typescript
// lib/supabase/queries.ts
getCachedLessons(userId); // 60s Cache, Tag: 'lessons'
getCachedLesson(lessonId); // 300s Cache, Tag: 'lessons'
getCachedUserProfile(userId); // 120s Cache, Tag: 'users'
```

**Invalidierung:**

```typescript
revalidateTag("lessons"); // Nach Lesson Create/Delete
revalidateTag("users"); // Nach Profile-Update
```

---

## Umgebungsvariablen

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=postgresql://...  # Direct Postgres für Better-Auth

# Better-Auth
BETTER_AUTH_SECRET=...  # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# Unsend
UNSEND_API_KEY=us_...

# OpenAI (4 Models)
OPENAI_API_KEY=sk-proj-...
OPENAI_SELECTION_MODEL=gpt-4o-mini       # Topic Suggestions
OPENAI_MICRO_DOSE_MODEL=gpt-4o-mini      # Micro-Dose Research
OPENAI_DEEP_DIVE_MODEL=o1-mini           # Deep-Dive Research
OPENAI_STRUCTURE_MODEL=gpt-4o-mini       # Story + Quiz Generation
```

---

## Coding-Konventionen

**Imports:** Absolute (`@/lib/auth`)

**Auth-Checks:**

```typescript
// Server
const session = await auth.api.getSession({ headers: await headers() });

// Client
const { data: session } = useSession();
```

**Datenbank:**

- Client: `lib/supabase/client.ts`
- Server: `lib/supabase/server.ts`
- Gecacht: `lib/supabase/queries.ts`

**Styling:** Tailwind + `cn()` Helper

---

## Entwicklungsstatus

### ✅ Phase 0+1: MVP (ABGESCHLOSSEN)

- Better-Auth (Magic Link + Email/Password)
- Interactive Learning (Dialog → Story → Quiz)
- Topic Suggestions
- Next.js 15 Caching (86% schneller)
- Hybrid System (Legacy + Neu)

### 📋 Phase 2: Monetarisierung (GEPLANT)

- [ ] Upstash Rate Limiting
- [ ] LemonSqueezy-Integration
- [ ] Deep Dive Premium-Freischaltung

### 🚀 Phase 3: Erweiterte Features (SPÄTER)

- [ ] Async KI + E-Mail-Notification
- [ ] Spaced Repetition
- [ ] Topic-basiertes Caching (Multi-User)

---

## Quick Start für neue Sessions

1. **Kontext:** Lies `INTERACTIVE-LEARNING.md` für Details zum 3-Phasen-System
2. **Status:** Phase 1.5 abgeschlossen, Phase 2 (Monetarisierung) als nächstes
3. **Wichtig:**
   - `total_score = quiz_score` (V1.2)
   - Max. 5 Dialog-Antworten (V1.1)
   - Robuste Chart-Validierung (V1.2.1)
   - Hybrid System: `!!lesson.current_phase` prüfen

---

**Letzte Aktualisierung:** 2025-10-24 (V1.3 - Dialog-Persistierung + Performance-Optimierungen)
**Projekt-Status:** Phase 1.5 ✅ | Phase 2 (Monetarisierung) 📋

**Neueste Features:**

- ✅ Interactive Learning V1.3 (Dialog-Persistierung + Personalisierung)
- ✅ Background Story Generation (Fire & Forget Pattern)
- ✅ Dialog-Hang-Fix (RLS Policies + Error Handling)
- ✅ Light Research (83-90% schnellere Initial-Ladezeit)
- ✅ Dashboard Status-System (Phase-Anzeige: 📝📖🎯)
- ✅ D3.js → Recharts Migration (Bundle-Size -1MB)
- ✅ Dialog Limit (Max. 5 Antworten + verschärfte System-Prompts)
- ✅ Zeitzonen-Fix (TIMESTAMPTZ für alle Zeitstempel)
