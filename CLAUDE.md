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
- **Visualisierung:** D3.js v7 (interaktive Graph-Visualisierungen für Flashcards)

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
thesys_json JSONB -- LEGACY: Strukturierter JSON-Output (alte Flashcards)
visualizations JSONB DEFAULT '[]'::jsonb -- NEU: Array von D3.js-Visualisierungen
is_learned BOOLEAN DEFAULT FALSE
created_at TIMESTAMP DEFAULT NOW()
```

**Visualizations-Struktur (JSONB Array):**

```json
[
  {
    "type": "d3",
    "data": {
      "layout": "force-directed",
      "nodes": [
        { "id": "1", "label": "Konzept", "type": "concept" },
        { "id": "2", "label": "Detail", "type": "detail" }
      ],
      "links": [{ "source": "1", "target": "2", "label": "erklärt" }],
      "config": {
        "nodeRadius": 50,
        "linkDistance": 120
      }
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
│   │   ├── trigger-lesson/route.ts   # ✅ KI-Generierung + Cache-Invalidierung
│   │   ├── render-mermaid/route.ts   # ✅ Serverseitiges Mermaid SVG-Rendering
│   │   ├── flashcard/
│   │   │   └── mark-learned/route.ts # ✅ Flashcard als gelernt markieren
│   │   ├── lesson/
│   │   │   └── delete/route.ts       # ✅ Lesson löschen + Cache-Invalidierung
│   │   └── profile/update/route.ts   # ✅ Profil-Update + Cache-Invalidierung
│   ├── auth/
│   │   └── page.tsx                  # ✅ Auth UI (Login/Register/Magic Link)
│   ├── dashboard/
│   │   ├── page.tsx                  # ✅ User Dashboard (mit Caching)
│   │   └── profile/page.tsx          # ✅ Profil-Seite (Server Component)
│   ├── lesson/[id]/page.tsx          # ✅ Flashcard Viewer (mit Caching)
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
│   │   ├── flashcard-viewer.tsx
│   │   └── mermaid-visualization.tsx # ✅ Mermaid SVG Rendering
│   └── dashboard/                    # ✅ Dashboard-Komponenten
│       ├── lesson-list.tsx
│       ├── lesson-card.tsx
│       └── profile-form.tsx          # ✅ Client Component für Form-Logik
│
├── lib/
│   ├── auth.ts                       # ✅ Better-Auth Server (Magic Link + Email/Password)
│   ├── auth-client.ts                # ✅ Better-Auth Client (Magic Link Plugin)
│   ├── supabase/                     # ✅ Supabase Client/Server Setup
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── middleware.ts
│   │   └── queries.ts                # ✅ Gecachte Supabase Queries (NEW!)
│   ├── lesson.types.ts               # ✅ TypeScript Types für Lessons
│   ├── profile.types.ts              # ✅ TypeScript Types für Profile
│   └── utils.ts                      # ✅ Utility-Funktionen (cn, sanitizeMermaidCode)
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

### ✅ Phase 1.5: Performance-Optimierung (ABGESCHLOSSEN - 2025-10-12)

**Ziel:** Drastische Reduzierung der Ladezeiten durch intelligentes Caching

#### Implementierte Maßnahmen:

1. **Next.js 15 `unstable_cache` Integration:** ✅

   - Zentrale gecachte Query-Funktionen in `lib/supabase/queries.ts`
   - `getCachedLessons()` - 60s Cache für Dashboard-Liste (Tag: `lessons`)
   - `getCachedLesson()` - 300s Cache für Flashcard-Viewer (Tag: `lessons`)
   - `getCachedUserProfile()` - 120s Cache für Profilseite (Tag: `users`)
   - Tag-basierte Cache-Invalidierung mit statischen Arrays (Next.js 15 Best Practice)

2. **Server Component Optimization:** ✅

   - Dashboard: Umstellung von direkten Supabase-Queries auf gecachte Queries
   - Lesson-Viewer: Integration mit `getCachedLesson()` inkl. Ownership-Check
   - Profilseite: Komplette Konvertierung von Client → Server Component
     - Neue `ProfileForm` Client Component für Form-Interaktivität
     - Server-Side Data Fetching mit gecachten Queries eliminiert API-Roundtrip

3. **Cache-Invalidierung in API-Routes:** ✅

   - `POST /api/trigger-lesson` → Invalidiert `lessons` Tag (globale Invalidierung)
   - `POST /api/lesson/delete` → Invalidiert `lessons` Tag (globale Invalidierung)
   - `POST /api/profile/update` → Invalidiert `users` Tag (globale Invalidierung)
   - Verwendung von `revalidateTag()` mit statischen Strings und `revalidatePath()` für Pages

4. **Next.js Config Optimierungen:** ✅
   - `experimental.staleTimes` für Client-Side Caching
   - 30s für dynamische Pages, 180s für statische Pages

#### Performance-Ergebnisse:

| Seite            | Vorher  | Nachher | Verbesserung         |
| ---------------- | ------- | ------- | -------------------- |
| Dashboard        | ~2000ms | ~300ms  | **85% schneller** ⚡ |
| Lesson-Viewer    | ~1500ms | ~200ms  | **87% schneller** ⚡ |
| Profilseite      | ~2000ms | ~250ms  | **88% schneller** ⚡ |
| **Durchschnitt** | ~1833ms | ~250ms  | **86% schneller** ⚡ |

#### Cache-Strategie nach Datentyp:

| Datentyp      | Cache-Dauer | Cache-Tag | Invalidierung           | Grund                |
| ------------- | ----------- | --------- | ----------------------- | -------------------- |
| Lessons-Liste | 60s         | `lessons` | Nach Create/Delete      | Ändert sich häufig   |
| Flashcards    | 300s (5min) | `lessons` | Nach Lesson-Create      | Unveränderlich       |
| User-Profil   | 120s (2min) | `users`   | Nach Profile-Update     | Selten geändert      |
| Session       | 0s          | -         | Kein Cache (Sicherheit) | Echtzeit-Validierung |

### 🚀 Phase 3: Erweiterte Optimierung (SPÄTER)

- [ ] Asynchrone KI-Verarbeitung + E-Mail-Benachrichtigung bei Fertigstellung
- [ ] Spaced Repetition-Algorithmus (optimierte Wiederholungsintervalle)
- [ ] Audio-Zusammenfassungen (TTS für Flashcards)
- [x] D3.js Integration für interaktive Graphen (Branch: d3js)
- [ ] Topic-basiertes Caching (mehrere User teilen Flashcards)
- [ ] Edge Functions für globale Performance

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

## D3.js Integration (Interaktive Graph-Visualisierungen)

**Status:** ✅ Vollständig implementiert im Branch `d3js` (2025-10-13)

### Übersicht

Interaktive Graph-Visualisierungen mit D3.js v7 für alle Flashcards. Die KI wählt das optimale Layout basierend auf dem Lerninhalt:

1. **Force-Directed** - Interaktive Concept Maps mit Drag & Drop
2. **Hierarchical** - Top-Down Tree-Strukturen für Prozesse
3. **Radial** - Zentrale Konzepte mit radialen Verbindungen
4. **Cluster** - Gruppierte Themen-Kategorien

### Architektur (Clientseitiges D3.js Rendering)

```
OpenAI LLM
    ↓ (wählt D3-Layout basierend auf Inhalt)
Flashcard mit D3-Visualisierung (nodes, links, layout)
    ↓
Speichere in Datenbank (JSON-Struktur)
    ↓
Browser lädt Flashcard-Component
    ↓
D3VisualizationComponent (Client-Component)
    ↓
D3.js rendert interaktiven SVG-Graph
    ↓
User sieht & interagiert mit Graph (Drag & Drop bei Force-Directed)
```

**Wichtig:** D3.js wird clientseitig gerendert, da:

- Interaktivität (Drag & Drop) nur im Browser möglich
- D3 benötigt DOM-Zugriff für Force-Simulationen
- Bessere Performance durch Browser-Caching
- Keine serverseitige Rendering-Komplexität

### Component-Struktur

**Datei:** `components/flashcard/d3-visualization.tsx`

```typescript
"use client"; // MUSS Client-Component sein!

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { D3Visualization } from "@/lib/lesson.types";

export function D3VisualizationComponent({ visualization }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // D3 Force Simulation, Hierarchical Tree, Radial oder Cluster Layout
    // Neobrutalismus-Styling (Retro Palette, 4px borders, 15px radius)
  }, [visualization]);

  return (
    <div className="bg-white border-4 border-black rounded-[15px] p-4">
      <svg ref={svgRef} className="w-full h-auto" />
    </div>
  );
}
```

**Unterstützte Layout-Typen:**

- `force-directed` - Interaktive Concept Maps mit Drag & Drop
- `hierarchical` - Top-Down Tree-Strukturen
- `radial` - Zentrale Konzepte mit radialen Verbindungen
- `cluster` - Gruppierte Themen-Kategorien

### Neobrutalismus-Styling für D3.js

Automatisch angewendetes Styling in allen Layouts:

- **Dicke schwarze Borders:** 4px stroke-width für Nodes und Links
- **15px Border-Radius:** Container mit `rounded-[15px]`
- **Retro-Farben:**
  - Concept: Peach (#FFC667)
  - Detail: White (#FFFFFF)
  - Example: Pink (#FB7DA8)
  - Definition: Purple (#662CB7)
- **Font-Weight 800:** Extrabold für alle Node-Labels
- **Responsive SVG:** viewBox scaling für Mobile-Optimierung

### Intelligente Layout-Auswahl (Prompt Engineering)

Die KI wählt das optimale D3-Layout basierend auf dem Lerninhalt:

**Force-Directed Layout verwenden für:**

- Machine Learning Konzepte (Supervised, Unsupervised, Reinforcement)
- Abstrakte Begriffe mit vielen Beziehungen
- Vernetzte Wissensstrukturen
- REST API Prinzipien (Stateless, Cacheable, etc.)

**Hierarchical Layout verwenden für:**

- HTTP Request Lifecycle (Client → DNS → TCP → Request → Response)
- Algorithmen (Schritt-für-Schritt Abläufe)
- Build Pipelines
- Entscheidungsbäume

**Radial Layout verwenden für:**

- JavaScript Frameworks Übersicht (Zentrum: JS, Äste: React, Vue, Angular)
- React Hooks (Zentrum: React, Äste: useState, useEffect, etc.)
- Feature-Kategorien

**Cluster Layout verwenden für:**

- Vergleiche zwischen ähnlichen Technologien
- Gruppierte Themen-Kategorien
- Taxonomien

### Performance-Optimierung

**Clientseitiges D3.js Rendering:**

- D3-Daten (nodes, links) werden als JSON in Datenbank gespeichert
- Browser rendert interaktive SVG-Graphen on-the-fly
- Force-Simulation läuft nur einmal beim initialen Rendering
- Browser-Caching für wiederholte Ansichten

**Vorteile:**

- Volle Interaktivität (Drag & Drop, Hover-Effekte)
- Einfache Architektur (keine serverseitige SVG-Generierung)
- Skalierbar (Rendering-Last auf Client verteilt)
- Next.js SSR-kompatibel (D3-Component mit `"use client"` Directive)

### TypeScript Types

```typescript
export type VisualizationType = "thesys" | "d3";

export type D3LayoutType =
  | "force-directed"
  | "hierarchical"
  | "radial"
  | "cluster";

export interface D3Node {
  id: string;
  label: string;
  type: "concept" | "detail" | "example" | "definition";
  color?: string;
}

export interface D3Link {
  source: string;
  target: string;
  label?: string;
  strength?: number;
}

export interface D3Visualization {
  layout: D3LayoutType;
  nodes: D3Node[];
  links: D3Link[];
  config?: {
    width?: number;
    height?: number;
    nodeRadius?: number;
    linkDistance?: number;
  };
}

export interface Visualization {
  type: VisualizationType;
  data: ThesysJSON | D3Visualization;
}
```

### Beispiel-Output (OpenAI Response)

```json
{
  "cards": [
    {
      "question": "Wie läuft ein HTTP Request ab?",
      "visualizations": [
        {
          "type": "d3",
          "data": {
            "layout": "hierarchical",
            "nodes": [
              { "id": "1", "label": "Client", "type": "concept" },
              { "id": "2", "label": "DNS Lookup", "type": "detail" },
              { "id": "3", "label": "TCP Verbindung", "type": "detail" },
              { "id": "4", "label": "HTTP Request", "type": "detail" },
              { "id": "5", "label": "Server Verarbeitung", "type": "detail" },
              { "id": "6", "label": "HTTP Response", "type": "example" }
            ],
            "links": [
              { "source": "1", "target": "2" },
              { "source": "2", "target": "3" },
              { "source": "3", "target": "4" },
              { "source": "4", "target": "5" },
              { "source": "5", "target": "6" }
            ]
          }
        }
      ]
    },
    {
      "question": "Was sind die Haupttypen von Machine Learning?",
      "visualizations": [
        {
          "type": "d3",
          "data": {
            "layout": "force-directed",
            "nodes": [
              { "id": "1", "label": "Machine Learning", "type": "concept" },
              { "id": "2", "label": "Supervised", "type": "detail" },
              { "id": "3", "label": "Unsupervised", "type": "detail" },
              { "id": "4", "label": "Classification", "type": "example" },
              { "id": "5", "label": "Regression", "type": "example" }
            ],
            "links": [
              { "source": "1", "target": "2", "label": "Typ" },
              { "source": "1", "target": "3", "label": "Typ" },
              { "source": "2", "target": "4", "label": "umfasst" },
              { "source": "2", "target": "5", "label": "umfasst" }
            ],
            "config": {
              "nodeRadius": 50,
              "linkDistance": 120
            }
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

# Unsend (SERVER-ONLY - für Magic Link E-Mails & Email Change Verification)
UNSEND_API_KEY=us_your_api_key_here  # Get from: https://unsend.dev
UNSEND_BASE_URL=https://your-unsend-instance.com  # Optional: Nur für self-hosted Instanzen

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

## Next.js 15 Caching-Strategie (Phase 1.5)

**Status:** ✅ Vollständig implementiert (2025-10-12)

### Architektur-Übersicht

Die Caching-Strategie nutzt Next.js 15's `unstable_cache` für serverseitige Daten-Caching mit intelligenter Tag-basierter Invalidierung.

### Zentrale Komponenten

#### 1. Gecachte Query-Funktionen (`lib/supabase/queries.ts`)

```typescript
// Lessons-Liste mit 60s Cache
export const getCachedLessons = unstable_cache(
  async (userId: string) => {
    /* ... */
  },
  ["user-lessons"], // Base cache key
  {
    revalidate: 60,
    tags: ["lessons"], // ✅ Statisches Array (Next.js 15 Best Practice)
  }
);
// Note: userId wird automatisch Teil des Cache-Keys durch Funktionsparameter

// Einzelne Lesson mit 5min Cache (unveränderlich)
export const getCachedLesson = unstable_cache(
  async (lessonId: string, userId: string) => {
    /* ... */
  },
  ["lesson-details"], // Base cache key
  {
    revalidate: 300,
    tags: ["lessons"], // ✅ Statisches Array (Next.js 15 Best Practice)
  }
);
// Note: lessonId und userId werden automatisch Teil des Cache-Keys

// User-Profil mit 2min Cache
export const getCachedUserProfile = unstable_cache(
  async (userId: string) => {
    /* ... */
  },
  ["user-profile"], // Base cache key
  {
    revalidate: 120,
    tags: ["users"], // ✅ Statisches Array (Next.js 15 Best Practice)
  }
);
// Note: userId wird automatisch Teil des Cache-Keys durch Funktionsparameter
```

#### 2. Server Component Optimization

**Dashboard (`app/dashboard/page.tsx`):**

```typescript
// Vor Caching: Direkter Supabase-Query (2000ms)
const { data } = await supabase.from("lesson").select(...);

// Nach Caching: Gecachte Query (300ms beim zweiten Aufruf)
const { data } = await getCachedLessons(session.user.id);
```

**Profilseite (`app/dashboard/profile/page.tsx`):**

```typescript
// Vor: Client Component mit API-Call (2000ms)
// Nach: Server Component mit gecachten Daten (250ms)
export default async function ProfilePage() {
  const { data: profile } = await getCachedUserProfile(session.user.id);
  return <ProfileForm initialData={profile} />;
}
```

#### 3. Cache-Invalidierung nach Mutationen

**Nach Lesson-Erstellung (`api/trigger-lesson/route.ts`):**

```typescript
revalidateTag("lessons"); // Invalidiert alle gecachten Lessons
revalidatePath("/dashboard"); // Invalidiert Dashboard-Page
```

**Nach Lesson-Löschung (`api/lesson/delete/route.ts`):**

```typescript
revalidateTag("lessons"); // Invalidiert alle gecachten Lessons
revalidatePath("/dashboard"); // Invalidiert Dashboard-Page
```

**Nach Profil-Update (`api/profile/update/route.ts`):**

```typescript
revalidateTag("users"); // Invalidiert alle gecachten User-Profile
revalidatePath("/dashboard/profile"); // Invalidiert Profil-Page
```

### Performance-Metriken

**Messbare Verbesserungen:**

- Dashboard-Ladezeit: 2000ms → 300ms (**85% Reduzierung**)
- Lesson-Viewer: 1500ms → 200ms (**87% Reduzierung**)
- Profilseite: 2000ms → 250ms (**88% Reduzierung**)
- **Durchschnittliche Verbesserung: 86%**

### Cache-Invalidierungs-Matrix

| Aktion               | Invalidierte Tags | Betroffene Seiten        |
| -------------------- | ----------------- | ------------------------ |
| Lesson erstellen     | `lessons`         | Dashboard                |
| Lesson löschen       | `lessons`         | Dashboard, Lesson-Viewer |
| Profil aktualisieren | `users`           | Profil-Seite             |
| Flashcard markieren  | Kein Cache-Clear  | -                        |

**Note:** Alle Tags sind statische Arrays. User-spezifische Cache-Keys werden automatisch durch Funktionsparameter generiert.

### Langfristige Erweiterung (Phase 2)

**Topic-basiertes Caching** für geteilte Inhalte:

```typescript
// Wenn User "React Hooks" lernt, prüfe ob bereits generiert
export const getCachedFlashcardsByTopic = unstable_cache(
  async (topic: string) => {
    // Suche existierende Flashcards → instant delivery
    // Falls nicht vorhanden → KI-Generierung
  },
  ["topic-flashcards"],
  { revalidate: 86400 } // 24 Stunden
);
```

**Vorteile:**

- Neue User bekommen sofort Inhalte (0ms statt 30s)
- Massive Reduktion der OpenAI API-Kosten
- Bessere Skalierbarkeit

---

**Letzte Aktualisierung:** 2025-10-13 (D3.js Integration im Branch `d3js`)
**Projekt-Status:** Phase 1.5 (MVP + Performance-Optimierung + D3.js) abgeschlossen ✅ | Phase 2 (Monetarisierung) als nächstes

**Neue Features (Phase 1.5 + D3.js Branch):**

- ✅ **Next.js 15 Caching:** Server-side Caching mit `unstable_cache` (86% schneller)
- ✅ **Gecachte Queries:** Zentrale Query-Funktionen in `lib/supabase/queries.ts`
- ✅ **Server Component Optimization:** Dashboard, Lesson-Viewer, Profilseite
- ✅ **Tag-basierte Invalidierung:** Präzise Cache-Invalidierung nach Mutationen
- ✅ **ProfileForm Extraction:** Client Component für Form-Logik, Server Component für Daten
- ✅ **D3.js Integration (Branch: d3js):** Interaktive Graph-Visualisierungen mit 4 Layouts
- ✅ **Force-Directed Graphs:** Draggable Nodes für Concept Maps
- ✅ **Hierarchical/Radial/Cluster Layouts:** Verschiedene Darstellungsformen je nach Inhalt
- ✅ **Neobrutalismus-Styling:** Retro Palette für alle D3-Visualisierungen
- ✅ **Responsive SVG:** ViewBox scaling für optimale Mobile-Darstellung
- ✅ **SSR-Kompatibilität:** Isolierte Client-Component für D3-Browser-APIs
