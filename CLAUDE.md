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

## KI-Pipeline (Interactive Learning V1.2)

```
User Input → Optional: /api/suggest-topics (3 Vorschläge)
  ↓
POST /api/trigger-lesson { topic, lessonType }
  ↓
1. Auth Check
2. Create Lesson (status='pending', current_phase='dialog')
3. Research-Phase (OPENAI_MICRO_DOSE_MODEL / OPENAI_DEEP_DIVE_MODEL)
4. Content-Gen (OPENAI_STRUCTURE_MODEL → Story + Quiz)
5. Store in DB (flashcard table: phase='story'/'quiz')
6. Update status='completed'
  ↓
Redirect zu /lesson/[id]
  ↓
Dialog-Phase 💬 (Max. 5 Antworten → dialog_score)
  ↓
Story-Phase 📖 (3-5 Kapitel + Recharts)
  ↓
Quiz-Phase 🎯 (5-7 Fragen → quiz_score)
  ↓
Completion 🎉 (total_score = quiz_score)
```

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

**Performance:** 86% schneller (2000ms → 250ms Durchschnitt)

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

**Letzte Aktualisierung:** 2025-10-17 (V1.2.1 - Robuste Visualisierungs-Validierung)
**Projekt-Status:** Phase 1.5 ✅ | Phase 2 (Monetarisierung) 📋

**Neueste Features:**

- ✅ Interactive Learning V1.2.1 (3-stufige Chart-Validierung + Fallback-Daten)
- ✅ Vercel AI SDK v5 (Server Actions mit `streamUI`)
- ✅ Topic Suggestions (3 verfeinerte Optionen)
- ✅ Recharts Charts (Timeline, Comparison, Process, Concept-Map)
- ✅ Next.js 15 Caching (86% Performance-Boost)
- ✅ Dialog Limit (Max. 5 Antworten)
- ✅ Vereinfachte Scores (`total_score = quiz_score`)
