# CLAUDE.md - Projekt-Kontext für lernfa.st

## Projektübersicht

**lernfa.st** ist eine moderne Lernplattform, die komplexe Themen mithilfe von KI in visuell ansprechende, "mikrodosierte" Lernkarten (Flashcards) transformiert. Das Ziel ist schnelles, effektives Lernen durch innovative Visualisierung und eine kosteneffiziente KI-Pipeline.

### Kernidee

- KI-generierte Lernkarten mit visuellen Graphen/Mindmaps (via Thesys/C1)
- Neobrutalismus-Design für moderne, zugängliche UX
- Freemium-Modell: "Micro-Dose" (3-5 Karten, gratis/limitiert) vs "Deep Dive" (10-15 Karten, Premium)

### Zielgruppe

- **Primär:** Entwickler und Berufstätige für schnelle Einarbeitung in Nischenthemen
- **Sekundär:** Schüler zum visuellen Nachholen von verpasstem Stoff

---

## Tech Stack

### Frontend

- **Framework:** Next.js 15 (App Router, SSR)
- **React:** Version 19
- **TypeScript:** v5
- **Styling:** Tailwind CSS mit Neobrutalismus-Theme
- **UI-Komponenten:** Custom Neobrutalism UI (components/ui/)
- **Visualisierung:** Thesys/C1 (geplant für Graphen/Mindmaps in Flashcards)

### Backend & Services

| Service                 | Zweck                                                               | Status                       |
| ----------------------- | ------------------------------------------------------------------- | ---------------------------- |
| **Supabase**            | PostgreSQL Datenbank + Storage                                      | ✅ Konfiguriert              |
| **Better-Auth**         | E-Mail/Passwort + Magic Link Auth                                   | ✅ Vollständig implementiert |
| **Better-Auth-Harmony** | Email-Normalisierung + Validierung (55k+ Wegwerf-Domains blockiert) | ✅ Implementiert             |
| **Resend**              | Transaktionale E-Mails (Magic Links)                                | ✅ Implementiert             |
| **OpenAI / LLM API**    | KI-Generierung von Flashcards (direkt im Backend)                   | ✅ Implementiert             |
| **Stripe**              | Zahlungen & Abonnements                                             | ❌ Geplant (Phase 2)         |
| **Upstash Redis**       | Rate Limiting für Free-Tier                                         | ❌ Geplant (Phase 2)         |

### Hosting

- **Empfohlen:** Vercel (Serverless)
- **Entwicklung:** `pnpm dev` auf Port 3000

---

## Datenbank-Schema (Supabase PostgreSQL)

**Status:** ✅ Vollständig migriert (Better-Auth + App-Tabellen: lesson, flashcard, payment_subscription)

### Better-Auth Tabellen (✅ Erstellt)

#### Tabelle: `user`

```sql
id TEXT PRIMARY KEY
email TEXT UNIQUE NOT NULL
email_verified BOOLEAN DEFAULT FALSE
normalizedEmail TEXT UNIQUE -- ✅ NEU: Von better-auth-harmony verwaltet
name TEXT
image TEXT
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

**Zusätzliche Felder (Profile-Daten):**

- `age` (number, optional)
- `language` (string, default: "de")
- `learningGoals` (string, optional)
- `experienceLevel` (string, default: "beginner")
- `preferredDifficulty` (string, default: "medium")
- `preferredCardCount` (number, default: 5)
- `onboardingCompleted` (boolean, default: false)
- `profileUpdatedAt` (date, optional)

#### Tabelle: `session`

```sql
id TEXT PRIMARY KEY
user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
expires_at TIMESTAMP NOT NULL
token TEXT UNIQUE NOT NULL -- Hinzugefügt für Better-Auth
ip_address TEXT
user_agent TEXT
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

#### Tabelle: `account`

```sql
id TEXT PRIMARY KEY
user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
account_id TEXT NOT NULL
provider_id TEXT NOT NULL -- 'credential' | 'magic-link'
password TEXT
access_token TEXT
refresh_token TEXT
id_token TEXT
expires_at TIMESTAMP
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
UNIQUE(provider_id, account_id)
```

#### Tabelle: `verification`

```sql
id TEXT PRIMARY KEY
identifier TEXT NOT NULL
value TEXT NOT NULL
expires_at TIMESTAMP NOT NULL
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

### App-Tabellen (✅ Erstellt)

#### Tabelle: `lesson` (Lerneinheit)

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
topic TEXT NOT NULL -- z.B. "Quantum Computing Basics"
lesson_type TEXT NOT NULL CHECK (lesson_type IN ('micro_dose', 'deep_dive'))
status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
created_at TIMESTAMP DEFAULT NOW()
completed_at TIMESTAMP
```

#### Tabelle: `flashcard`

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
lesson_id UUID REFERENCES lesson(id) ON DELETE CASCADE
question TEXT NOT NULL
thesys_json JSONB -- LEGACY: Strukturierter JSON-Output für Thesys/C1 Visualisierung
visualizations JSONB DEFAULT '[]'::jsonb -- NEU: Array von Visualisierungen (Thesys + Mermaid)
is_learned BOOLEAN DEFAULT FALSE
created_at TIMESTAMP DEFAULT NOW()
```

**Visualizations-Struktur (JSONB Array):**

```json
[
  {
    "type": "thesys",
    "data": {
      "nodes": [...],
      "edges": [...],
      "layout": "hierarchical"
    }
  },
  {
    "type": "mermaid",
    "data": {
      "diagramType": "flowchart",
      "code": "flowchart TD\n  A --> B",
      "svg": "<svg>...</svg>"  // Optional: Gecachtes SVG
    }
  }
]
```

#### Tabelle: `payment_subscription` (Phase 2)

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID REFERENCES user(id) ON DELETE CASCADE
stripe_customer_id TEXT
stripe_subscription_id TEXT
status TEXT -- 'active' | 'canceled' | 'past_due'
plan_type TEXT -- 'premium_monthly' | 'premium_yearly'
current_period_end TIMESTAMP
```

---

## Projektstruktur

```
lernfast/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/route.ts    # ✅ Better-Auth Handler
│   │   ├── trigger-lesson/route.ts   # ✅ KI-Generierung mit intelligenter Visualisierungs-Auswahl
│   │   ├── render-mermaid/route.ts   # ✅ Serverseitiges Mermaid SVG-Rendering
│   │   ├── flashcard/
│   │   │   └── mark-learned/route.ts # ✅ Flashcard als gelernt markieren
│   │   └── profile/update/route.ts   # ✅ Profil-Update API
│   ├── auth/
│   │   └── page.tsx                  # ✅ Auth UI (Login/Register/Magic Link)
│   ├── dashboard/
│   │   ├── page.tsx                  # ✅ User Dashboard
│   │   └── profile/page.tsx          # ✅ Profil-Seite
│   ├── lesson/[id]/page.tsx          # ✅ Flashcard Viewer
│   ├── page.tsx                      # ✅ Landing Page mit Input + Navbar
│   ├── layout.tsx                    # ✅ Root Layout
│   └── globals.css                   # ✅ Neobrutalismus CSS Variables
│
├── components/
│   ├── ui/                           # ✅ Neobrutalismus UI-Komponenten
│   │   ├── input.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── tabs.tsx
│   │   ├── avatar.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── hamster-spinner.tsx       # ✅ Loading Animation
│   ├── navbar.tsx                    # ✅ Transparente Navbar mit Avatar
│   ├── loading-modal.tsx             # ✅ Loading Modal für KI-Generierung
│   ├── flashcard/                    # ✅ Flashcard-Komponenten
│   │   ├── flashcard.tsx
│   │   └── flashcard-viewer.tsx
│   └── dashboard/                    # ✅ Dashboard-Komponenten
│       ├── lesson-list.tsx
│       └── lesson-card.tsx
│
├── lib/
│   ├── auth.ts                       # ✅ Better-Auth Server (Magic Link + Email/Password)
│   ├── auth-client.ts                # ✅ Better-Auth Client (Magic Link Plugin)
│   ├── supabase/                     # ✅ Supabase Client/Server Setup
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── lesson.types.ts               # ✅ TypeScript Types für Lessons
│   ├── profile.types.ts              # ✅ TypeScript Types für Profile
│   └── utils.ts                      # ✅ Utility-Funktionen (cn, etc.)
│
├── supabase/migrations/              # ✅ Datenbank-Migrationen
├── masterplan.md                     # 📄 Detaillierte Projekt-Roadmap
├── CLAUDE.md                         # 📄 Dieses Dokument
└── example.env                       # 🔑 Umgebungsvariablen-Template
```

---

## Entwicklungsstatus & Roadmap

### ✅ Phase 0: Initial Setup & Auth (ABGESCHLOSSEN)

- [x] Next.js 15 + TypeScript Setup
- [x] Better-Auth Integration (E-Mail/Passwort + Magic Link)
- [x] Supabase Datenbank-Verbindung (PostgreSQL via pg.Pool)
- [x] Resend Integration für Magic Link E-Mails
- [x] Neobrutalismus UI-Design (Tailwind Config + CSS Variables)
- [x] Landing Page mit "What do you want to learn today?"-Input
- [x] Auth UI: Login/Register/Magic Link Tabs
- [x] Navbar: Transparente Navbar mit Avatar-Dropdown
- [x] UI-Komponenten: Input, Button, Card, Tabs, Avatar, Dropdown Menu
- [x] Datenbank-Migration: Better-Auth Tabellen (user, session, account, verification)
- [x] Session-Management: Auth-State in Homepage + Navbar

### ✅ Phase 1: MVP (ABGESCHLOSSEN)

**Ziel:** Erste funktionierende Version mit KI-generierten Lernkarten

#### Abgeschlossene Meilensteine:

1. **Datenbank-Migration (App-Tabellen):** ✅

   - `lesson`, `flashcard`, `payment_subscription` Tabellen erstellt
   - RLS Policies aktiviert für User-Datenschutz
   - Migrations in `supabase/migrations/` verwaltet

2. **KI-Pipeline (Backend-Integration):** ✅

   - Direkte LLM-Integration im Next.js Backend (OpenAI API)
   - Prompt Engineering: Strukturierte Flashcard-Generierung
   - Kosteneffiziente API-Nutzung (z.B. `gpt-4o-mini`)

3. **API Route: Lesson Trigger:** ✅

   - `POST /api/trigger-lesson` implementiert
   - Input: `{ topic: string, lessonType: 'micro_dose' | 'deep_dive' }`
   - Logik:
     1. User-Auth prüfen (Better-Auth Session)
     2. Neuen `lesson`-Eintrag in Supabase erstellen (Status: 'pending')
     3. KI-Generierung direkt im Backend ausführen
     4. Flashcards in Datenbank speichern (Status: 'completed')
     5. Response: `{ lessonId: uuid, status: 'completed' }`

4. **Flashcard-UI:** ✅

   - Komponente: `components/flashcard/FlashcardViewer.tsx`
   - Swipeable Card-Interface mit Neobrutalismus-Design
   - "Als gelernt markieren"-Button mit API-Integration
   - Fortschrittsanzeige

5. **Dashboard:** ✅

   - Route: `app/dashboard/page.tsx`
   - Liste aller Lessons des Users mit Status-Badges
   - Profil-Seite: `app/dashboard/profile/page.tsx`
   - Loading States mit Hamster-Animation
   - Link zu Flashcard-Viewer

6. **User Experience:** ✅
   - Loading Modal während KI-Generierung
   - Error Handling & User Feedback
   - Mobile-optimiertes Design

### 📋 Phase 2: Monetarisierung (GEPLANT)

- [ ] Upstash Rate Limiting (Free-Tier: z.B. 5 Micro-Doses/Tag)
- [ ] Stripe-Integration (Premium-Abo)
- [ ] Deep Dive-Feature freischalten für Premium
- [ ] Resend E-Mail-Integration

### 🚀 Phase 3: Optimierung (SPÄTER)

- [ ] Asynchrone KI-Verarbeitung + E-Mail-Benachrichtigung bei Fertigstellung
- [ ] Spaced Repetition-Algorithmus (optimierte Wiederholungsintervalle)
- [ ] Audio-Zusammenfassungen (TTS für Flashcards)
- [ ] Thesys/C1 Integration für visuelle Graphen/Mindmaps
- [ ] Performance-Optimierung (Caching, Edge Functions)

---

## KI-Pipeline Workflow (Backend-Integration)

**Status:** ✅ Implementiert

### Architektur:

```
User Input (Homepage/Dashboard)
    ↓ POST /api/trigger-lesson: { topic, lessonType }
Next.js API Route (Server-Side)
    ↓
1. Auth Check (Better-Auth Session)
    ↓
2. Create Lesson Entry (Supabase: status='pending')
    ↓
3. LLM API Call (OpenAI/Alternative)
   - Prompt Engineering (Few-Shot)
   - JSON-Output mit strukturierten Flashcards
    ↓
4. Parse & Validate Response
    ↓
5. Store Flashcards in DB (Supabase)
    ↓
6. Update Lesson Status → 'completed'
    ↓
Response: { lessonId, status }
    ↓
Client: Redirect zu /lesson/[id]
    ↓ (Optional in Phase 3)
Resend E-Mail-Benachrichtigung
```

### Implementierungsdetails:

**API Endpoint:** `POST /api/trigger-lesson`

**Input:**

```typescript
{
  topic: string; // z.B. "Quantum Computing Basics"
  lessonType: "micro_dose" | "deep_dive";
}
```

**Output:**

```typescript
{
  lessonId: string;           // UUID der erstellten Lesson
  status: 'completed' | 'failed';
  flashcards?: Array<{
    id: string;
    question: string;
    answer: string;
    difficulty?: string;
  }>;
  error?: string;             // Bei Fehler
}
```

**LLM Prompt-Struktur:**

- System Prompt: Rolle als Lern-Experte definieren
- User Prompt: Topic + gewünschte Anzahl Karten (basierend auf lessonType)
- Few-Shot Examples: 2-3 Beispiel-Flashcards für Konsistenz
- Output Format: Strukturiertes JSON mit question/answer Paaren

**Error Handling:**

- Bei LLM-Fehler → Lesson-Status auf 'failed' setzen
- Bei Parsing-Fehler → Retry mit angepasstem Prompt
- Bei DB-Fehler → Transaction Rollback
- User-Feedback über Loading Modal

---

## Mermaid.js Integration (Intelligente Visualisierungs-Auswahl)

**Status:** ✅ Clientseitiges Rendering implementiert (2025-10-12)

### Übersicht

Die KI wählt basierend auf dem Lerninhalt intelligent zwischen verschiedenen Visualisierungstypen:

1. **Thesys (Concept Maps)** - Für konzeptionelle Zusammenhänge
2. **Mermaid Flowchart** - Für Prozesse und Abläufe
3. **Mermaid Mindmap** - Für Themenübersichten
4. **Mermaid Sequence** - Für Interaktionen und Kommunikation
5. **Mermaid Class/ER** - Für Strukturen und Datenmodelle
6. **Beide (Thesys + Mermaid)** - Für komplexe Themen

### Architektur (Clientseitiges Rendering)

```
OpenAI LLM
    ↓ (wählt Visualisierung basierend auf Inhalt)
Flashcard mit visualizations Array
    ↓
Speichere in Datenbank (nur Mermaid-Code, kein SVG)
    ↓
Browser lädt Flashcard-Component
    ↓
MermaidVisualizationComponent (Client-Component)
    ↓
mermaid.js rendert SVG direkt im Browser
    ↓
User sieht interaktives Diagramm
```

**Wichtig:** Mermaid wird ausschließlich clientseitig gerendert, da:

- Bessere Performance durch Browser-Caching
- Keine zusätzliche API-Infrastruktur (kein Puppeteer/Server-Side Rendering)
- Mermaid.js nutzt Browser-APIs und kann nicht serverseitig gerendert werden (Next.js SSR-Konflikt)

### Component-Struktur

**Datei:** `components/flashcard/mermaid-visualization.tsx`

```typescript
"use client"; // MUSS Client-Component sein!

import mermaid from "mermaid";

export function MermaidVisualizationComponent({ mermaidData }) {
  // Rendert Mermaid-Code zu SVG im Browser
  // Nutzt Neobrutalismus-Theme (Peach, Pink, Teal, Black borders)
}
```

**Supported Diagram Types:**

- `flowchart` - Prozess-Diagramme
- `mindmap` - Themenübersichten
- `sequence` - Interaktions-Diagramme
- `class` - Klassendiagramme
- `er` - Entity-Relationship-Diagramme
- `state` - Zustandsdiagramme
- `gantt` - Zeitpläne
- `pie` - Kreisdiagramme
- `quadrant` - Quadranten-Diagramme
- `timeline` - Zeitlinien

### Code Sanitization (Best Practice)

**Funktion:** `sanitizeMermaidCode()` in `lib/utils.ts`

Bereinigt Mermaid-Code gemäß offizieller Mermaid.js Dokumentation:

**1. Konvertiert escaped Newlines zu echten Zeilenumbrüchen:**

```typescript
// OpenAI gibt oft:
"flowchart TD\\n  Start"

// Mermaid.js braucht:
"flowchart TD
  Start"
```

**2. Entfernt problematische Tabs und Whitespaces:**

```typescript
// Tabs → Spaces
"flowchart TD\\t  Start" → "flowchart TD    Start"

// Trim pro Zeile
"  flowchart TD  \n  Start  " → "flowchart TD\n  Start"
```

**3. Escaped Special Characters in Node-Labels:**

```typescript
// Problematisch (Parse-Error):
A[Text (mit Klammern)]
B[Text: Doppelpunkt]

// Korrekt (mit Quotes):
A["Text (mit Klammern)"]
B["Text: Doppelpunkt"]
```

**Anwendung:**

- Serverseitig: In `api/trigger-lesson/route.ts` beim Speichern
- Clientseitig: In `mermaid-visualization.tsx` vor dem Rendering
- Verhindert Parse-Errors durch inkonsistente OpenAI-Outputs

### Neobrutalismus-Styling für Mermaid

Automatisch angewendetes CSS:

- **Dicke schwarze Borders:** 4px stroke-width
- **15px Border-Radius:** Abgerundete Ecken
- **Retro-Farben:** Peach (#FFC667), Pink (#FB7DA8), Teal (#00D9BE), Blue (#0CBCD7)
- **Font-Weight 800:** Extrabold für alle Labels
- **Box-Shadows:** 4px 4px 0px 0px rgba(0,0,0,1)

### Intelligente Visualisierungs-Auswahl (Prompt Engineering)

Die KI folgt diesen Richtlinien:

**Flowchart verwenden für:**

- HTTP Request Lifecycle
- Algorithmen (Binary Search, Sorting)
- Build Pipelines
- Entscheidungsbäume

**Mindmap verwenden für:**

- JavaScript Frameworks Übersicht
- Machine Learning Kategorien
- Themen-Cluster

**Sequence Diagram verwenden für:**

- OAuth 2.0 Flow
- API Request/Response
- Client-Server Kommunikation

**Class/ER Diagram verwenden für:**

- Datenbank-Schemas
- OOP-Klassenstrukturen
- E-Commerce Datenmodell

**Thesys verwenden für:**

- Abstrakte Konzepte (REST Prinzipien)
- Definitionen (Was ist Cloud Computing?)
- Hierarchische Wissensstrukturen

**Beide (Thesys + Mermaid) verwenden für:**

- Komplexe Themen mit Konzepten UND Prozessen
- Beispiel: "REST API Design" → Thesys (Prinzipien) + Flowchart (Request Handling)

### Performance-Optimierung

**Clientseitiges Rendering:**

- Mermaid-Code wird in Datenbank gespeichert (kein SVG-Pre-Rendering)
- Browser rendert SVG on-the-fly beim ersten Laden der Flashcard
- Browser-eigenes Caching sorgt für schnelle Wiederholungen
- Kein serverseitiger Overhead (kein Puppeteer, keine zusätzliche API)

**Vorteile:**

- Einfachere Architektur (keine zusätzlichen Dependencies wie Puppeteer)
- Schnellere KI-Generierung (keine serverseitigen SVG-Rendering-Wartezeiten)
- Bessere Skalierbarkeit (Rendering-Last auf Client verteilt)
- Next.js SSR-kompatibel (Mermaid-Component ist korrekt als "use client" isoliert)

### TypeScript Types

```typescript
export type VisualizationType = "thesys" | "mermaid";

export type MermaidDiagramType =
  | "flowchart"
  | "mindmap"
  | "sequence"
  | "class"
  | "state"
  | "er"
  | "gantt"
  | "pie"
  | "quadrant"
  | "timeline";

export interface MermaidVisualization {
  diagramType: MermaidDiagramType;
  code: string;
  svg?: string; // Optional cached SVG
}

export interface Visualization {
  type: VisualizationType;
  data: ThesysJSON | MermaidVisualization;
}
```

### Beispiel-Output (OpenAI Response)

```json
{
  "cards": [
    {
      "question": "Wie funktioniert ein HTTP Request?",
      "visualizations": [
        {
          "type": "mermaid",
          "data": {
            "diagramType": "flowchart",
            "code": "flowchart TD\n  A[Client] --> B[DNS Lookup]\n  B --> C[TCP Connection]\n  C --> D[HTTP Request]\n  D --> E[Server Processing]\n  E --> F[HTTP Response]"
          }
        }
      ]
    },
    {
      "question": "Was sind die REST Prinzipien?",
      "visualizations": [
        {
          "type": "thesys",
          "data": {
            "nodes": [
              { "id": "1", "label": "REST", "type": "concept" },
              { "id": "2", "label": "Stateless", "type": "detail" }
            ],
            "edges": [{ "from": "1", "to": "2", "label": "erfordert" }],
            "layout": "hierarchical"
          }
        },
        {
          "type": "mermaid",
          "data": {
            "diagramType": "sequence",
            "code": "sequenceDiagram\n  Client->>Server: GET /api/users\n  Server->>Database: Query Users\n  Database-->>Server: User Data\n  Server-->>Client: 200 OK + JSON"
          }
        }
      ]
    }
  ]
}
```

---

## Umgebungsvariablen (.env.local)

```bash
# Supabase (PUBLIC - safe for client-side)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Better-Auth Database (SERVER-ONLY - Direct Postgres Connection)
DATABASE_URL=postgresql://postgres.PROJECT-REF:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

# Better-Auth Configuration (SERVER-ONLY)
BETTER_AUTH_SECRET=your-secret-key-min-32-chars  # Generate: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Resend (SERVER-ONLY - für Magic Link E-Mails)
RESEND_API_KEY=re_your_api_key_here  # Get from: https://resend.com/api-keys

# OpenAI / LLM API (SERVER-ONLY - für KI-Generierung)
OPENAI_API_KEY=sk-proj-...  # Get from: https://platform.openai.com/api-keys
# Alternativ: ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY, etc.

# Stripe (Phase 2 - noch nicht implementiert)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Upstash Redis (Phase 2 - noch nicht implementiert)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Design-System (Neobrutalismus)

### Farben (CSS Variables in globals.css)

- `--background`: Haupthintergrund (Hell)
- `--foreground`: Haupttext (Dunkel)
- `--main`: Akzentfarbe (z.B. Blau/Grün)
- `--border`: Schwarze Rahmen (Dicke: 2-3px)
- `--shadow`: Box-Shadow (4px/4px Offset, schwarze Farbe)

### Typografie

- **Überschriften:** `font-heading` (font-weight: 800)
- **Body:** `font-base` (font-weight: 500)

### Interaktionen

- **Hover-Effekt:** `translate(4px, 4px)` + Shadow entfernen
- **Border-Radius:** `15px` (gerundet, aber nicht zu soft)

### Komponenten-Beispiel

Siehe: `components/ui/input.tsx` für Referenz-Implementation

---

## Bekannte Herausforderungen

### 1. KI-Prompting-Qualität

**Problem:** LLM liefert inkonsistente JSON-Outputs für Thesys/C1
**Lösung:** Few-Shot Prompting in n8n + JSON Schema Validation

### 2. Kostenkontrolle

**Problem:** Hohe LLM-API-Kosten bei vielen Free-Usern
**Lösung:** Strenge Rate Limits (Upstash) + Sofortige Premium-Monetarisierung

### 3. Ladezeiten (Deep Dive)

**Problem:** 10-15 Karten-Generierung dauert >30s
**Lösung:**

- Aktuell: Loading Modal mit Hamster-Animation für bessere UX
- Phase 3: Asynchrone Verarbeitung + E-Mail-Notification bei Fertigstellung

### 4. Thesys/C1 Integration

**Problem:** Komplexität der Graph-Rendering-Library
**Fallback:** Erstmal Plaintext-Flashcards, Thesys später hinzufügen

---

## Wichtige Coding-Konventionen

### Imports

- **Absolute Imports:** `@/` für Projekt-Root (via tsconfig paths)
- **Beispiel:** `import { auth } from '@/lib/auth'`

### Datenbank-Queries

- **Client-Side:** `lib/supabase/client.ts` (für React Components)
- **Server-Side:** `lib/supabase/server.ts` (für API Routes, Server Components)
- **Middleware:** `lib/supabase/middleware.ts` (für Edge Runtime)

### Auth-Checks

- **Server Components/API Routes:**

  ```typescript
  import { auth } from "@/lib/auth";
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect("/login");
  ```

- **Client Components:**
  ```typescript
  import { useSession } from "@/lib/auth-client";
  const { data: session } = useSession();
  ```

### Styling

- **Präferenz:** Tailwind utility classes
- **cn() Helper:** Für conditional classNames (`lib/utils.ts`)
- **Custom CSS:** Nur für globale Neobrutalismus-Variables

---

## Testing & Entwicklung

### Dev-Server starten

```bash
pnpm dev
# → http://localhost:3000
```

### Build testen

```bash
pnpm build
pnpm start
```

### Linting

```bash
pnpm lint
```

---

## Ressourcen & Dokumentation

- **Masterplan:** Siehe `masterplan.md` für vollständige Feature-Roadmap
- **Better-Auth Docs:** https://better-auth.com
- **Supabase Docs:** https://supabase.com/docs
- **OpenAI API Docs:** https://platform.openai.com/docs
- **Resend Docs:** https://resend.com/docs
- **Thesys/C1:** (Dokumentation noch zu recherchieren)
- **Neobrutalismus Design:** https://neobrutalism.dev

---

## Quick Start für neue Claude-Sessions

1. **Kontext erfassen:**

   - Lies `masterplan.md` für strategische Vision
   - Lies diese Datei für technische Details
   - Check `app/page.tsx` für aktuellen UI-Stand

2. **Prioritäten:**

   - **Phase 1 MVP** ist abgeschlossen ✅
   - Nächstes Ziel: **Phase 2 Monetarisierung** (Rate Limiting + Stripe)
   - Fokus auf: User Experience Verbesserungen, Performance-Optimierung

3. **Bei neuen Features:**

   - Prüfe Roadmap in diesem Dokument
   - Beachte Neobrutalismus-Design-System
   - Verwende absolute Imports (`@/`)
   - Teste Auth-Flow (Better-Auth)

4. **Bei Fragen:**
   - Datenbank-Schema siehe "Datenbank-Schema (Supabase PostgreSQL)"
   - KI-Pipeline siehe "KI-Pipeline Workflow (Backend-Integration)"
   - API-Endpunkte siehe "Projektstruktur" → `app/api/`
   - Design-Tokens siehe "Design-System (Neobrutalismus)"

---

---

## Authentifizierungs-Flow (Better-Auth)

### Magic Link (Passwortlos)

1. User gibt E-Mail ein auf `/auth` (Magic Link Tab)
2. Client: `authClient.signIn.magicLink({ email, callbackURL })`
3. Server: Better-Auth generiert Token + ruft `sendMagicLink` auf
4. Resend sendet E-Mail mit Neobrutalismus-Design Template
5. User klickt Link → Redirect zu `/magic-link/verify?token=...`
6. Better-Auth verifiziert Token → Session erstellt
7. Redirect zu `callbackURL` (z.B. `/` mit Topic-Parameter)

### E-Mail/Passwort

1. User gibt Credentials ein auf `/auth`
2. Client: `authClient.signIn.email({ email, password })`
3. Server: Better-Auth verifiziert gegen `account.password` (bcrypt)
4. Session erstellt → User eingeloggt

### Session-Verwaltung

- **Cookie-basiert:** Better-Auth setzt `better-auth.session_token` Cookie
- **Client-Side Check:** `useSession()` Hook in React Components
- **Server-Side Check:** `auth.api.getSession({ headers })` in API Routes
- **Logout:** `authClient.signOut()` löscht Session + Cookie

---

## Wichtige Implementation-Details

### Warum kein RLS für Better-Auth Tabellen?

Better-Auth greift **direkt via PostgreSQL** (`pg.Pool`) auf die Datenbank zu, nicht über Supabase's API. Deshalb:

- ✅ Service Role hat vollen Zugriff (via `DATABASE_URL`)
- ❌ RLS wird NICHT benötigt für `user`, `session`, `account`, `verification`
- ✅ RLS NUR für App-Tabellen (`lesson`, `flashcard`, `payment_subscription`)

### Session Token Fix

Die `session.token` Spalte wurde manuell hinzugefügt (bessere-auth CLI generierte sie nicht):

```sql
ALTER TABLE "session"
ADD COLUMN IF NOT EXISTS "token" TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text;
```

### Resend E-Mail Absender

- **Dev:** `onboarding@resend.dev` (Resend's Test-Domain)
- **Prod:** Später zu `auth@lernfa.st` ändern (Domain-Verifizierung nötig)

---

**Letzte Aktualisierung:** 2025-10-12 (Mermaid.js Integration mit clientseitigem Rendering + Code Sanitization)
**Projekt-Status:** Phase 1 MVP + Mermaid Integration abgeschlossen ✅ | Phase 2 (Monetarisierung) als nächstes

**Neue Features:**

- ✅ Intelligente Visualisierungs-Auswahl durch KI (Thesys + Mermaid)
- ✅ Clientseitiges Mermaid SVG-Rendering im Browser (kein Puppeteer)
- ✅ Robuste Code-Sanitization gemäß Mermaid.js Best Practices (Newlines, Special Chars)
- ✅ Neobrutalismus-Styling für alle Mermaid-Diagramme
- ✅ Support für 10+ Mermaid-Diagrammtypen (Flowchart, Mindmap, Sequence, Class, ER, etc.)
- ✅ Isolierte Client-Component für SSR-Kompatibilität
- ✅ Browser-Caching für Performance-Optimierung
