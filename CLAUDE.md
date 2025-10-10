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
| Service | Zweck | Status |
|---------|-------|--------|
| **Supabase** | PostgreSQL Datenbank + Storage | ✅ Konfiguriert |
| **Better-Auth** | E-Mail/Passwort + Magic Link Auth | ✅ Vollständig implementiert |
| **Resend** | Transaktionale E-Mails (Magic Links) | ✅ Implementiert |
| **n8n** | KI-Workflow-Orchestrierung (Webhook-basiert) | ❌ Noch nicht implementiert |
| **Stripe** | Zahlungen & Abonnements | ❌ Geplant (Phase 2) |
| **Upstash Redis** | Rate Limiting für Free-Tier | ❌ Geplant (Phase 2) |

### Hosting
- **Empfohlen:** Vercel (Serverless)
- **Entwicklung:** `pnpm dev` auf Port 3000

---

## Datenbank-Schema (Supabase PostgreSQL)

**Status:** ✅ Better-Auth Tabellen migriert | ⚠️ App-Tabellen (lesson/flashcard) noch ausstehend

### Better-Auth Tabellen (✅ Erstellt)

#### Tabelle: `user`
```sql
id TEXT PRIMARY KEY
email TEXT UNIQUE NOT NULL
email_verified BOOLEAN DEFAULT FALSE
name TEXT
image TEXT
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

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

### App-Tabellen (⚠️ Noch zu migrieren)

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
thesys_json JSONB -- Strukturierter JSON-Output für Thesys/C1 Visualisierung
is_learned BOOLEAN DEFAULT FALSE
created_at TIMESTAMP DEFAULT NOW()
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
│   │   └── trigger-lesson/           # ❌ TODO: n8n Webhook Trigger
│   ├── auth/
│   │   └── page.tsx                  # ✅ Auth UI (Login/Register/Magic Link)
│   ├── dashboard/                    # ❌ TODO: User Dashboard
│   ├── lesson/[id]/                  # ❌ TODO: Flashcard Viewer
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
│   │   ├── avatar.tsx               # ✅ Avatar Component
│   │   └── dropdown-menu.tsx        # ✅ Dropdown Menu Component
│   ├── navbar.tsx                    # ✅ Transparente Navbar mit Avatar
│   ├── flashcard/                    # ❌ TODO: Flashcard-Komponente
│   └── dashboard/                    # ❌ TODO: Dashboard-Komponenten
│
├── lib/
│   ├── auth.ts                       # ✅ Better-Auth Server (Magic Link + Email/Password)
│   ├── auth-client.ts                # ✅ Better-Auth Client (Magic Link Plugin)
│   ├── supabase/                     # ✅ Supabase Client/Server Setup
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── utils.ts                      # ✅ Utility-Funktionen (cn, etc.)
│
├── supabase-migration.sql            # ✅ Datenbank-Migration (App-Tabellen)
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

### 🔄 Phase 1: MVP (IN ARBEIT)
**Ziel:** Erste funktionierende Version mit KI-generierten Lernkarten

#### Nächste kritische Schritte:
1. **Datenbank-Migration (App-Tabellen):**
   - ⚠️ SQL-Datei vorhanden: `supabase-migration.sql`
   - Auszuführen: `lesson`, `flashcard`, `payment_subscription` Tabellen erstellen
   - RLS Policies aktivieren für User-Datenschutz
   - Migration im Supabase SQL Editor ausführen

2. **n8n KI-Pipeline (MVP):**
   - n8n-Workflow aufbauen für "Micro-Dose"-Generierung (3-5 Karten)
   - Prompt Engineering: JSON-Output für Thesys/C1-Format
   - LLM-Auswahl: Kosteneffiziente API (z.B. `gpt-4o-mini`)

3. **API Route: Lesson Trigger:**
   - `POST /api/trigger-lesson` erstellen
   - Input: `{ topic: string, lessonType: 'micro_dose' | 'deep_dive' }`
   - Logik:
     1. User-Auth prüfen (Better-Auth Session)
     2. Neuen `lesson`-Eintrag in Supabase erstellen (Status: 'pending')
     3. n8n-Webhook triggern mit Topic + Lesson-ID
     4. Response: `{ lessonId: uuid, status: 'processing' }`

4. **Flashcard-UI:**
   - Komponente: `components/flashcard/FlashcardViewer.tsx`
   - Thesys/C1 JSON-Rendering (oder Fallback zu Plaintext)
   - "Als gelernt markieren"-Button

5. **Dashboard:**
   - Route: `app/dashboard/page.tsx`
   - Liste aller Lessons des Users
   - Status-Anzeige (Pending/Processing/Completed)
   - Link zu Flashcard-Viewer

### 📋 Phase 2: Monetarisierung (GEPLANT)
- [ ] Upstash Rate Limiting (Free-Tier: z.B. 5 Micro-Doses/Tag)
- [ ] Stripe-Integration (Premium-Abo)
- [ ] Deep Dive-Feature freischalten für Premium
- [ ] Resend E-Mail-Integration

### 🚀 Phase 3: Optimierung (SPÄTER)
- [ ] Asynchrone n8n-Verarbeitung + E-Mail-Benachrichtigung
- [ ] Spaced Repetition-Algorithmus
- [ ] Audio-Zusammenfassungen (TTS)

---

## KI-Pipeline Workflow (n8n)

**Status:** ❌ Noch nicht implementiert

### Konzept:
```
Next.js API Route (Webhook-Client)
    ↓ POST: { topic, lessonId }
n8n Workflow (Webhook-Trigger)
    ↓
LLM Prompt Engineering (Few-Shot)
    ↓ JSON-Output
Thesys/C1 Struktur-Validierung
    ↓
Supabase: Flashcards erstellen + Lesson-Status → 'completed'
    ↓ (Optional in Phase 3)
Resend E-Mail-Benachrichtigung
```

### Kritische Anforderungen an n8n:
- **Input:** Topic (String), Lesson ID (UUID), Lesson Type (Enum)
- **Output:** Array von Flashcards im Format:
  ```json
  {
    "question": "Was ist Quantum Superposition?",
    "thesys_json": {
      "nodes": [...],
      "edges": [...],
      "layout": "force-directed"
    }
  }
  ```
- **Error Handling:** Bei Fehler → Supabase Lesson-Status auf 'failed' setzen

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

# n8n (Phase 1 - noch nicht implementiert)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/generate-lesson

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
**Lösung:** Asynchrone n8n-Verarbeitung + E-Mail-Notification (Phase 3)

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
  import { auth } from '@/lib/auth';
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect('/login');
  ```

- **Client Components:**
  ```typescript
  import { useSession } from '@/lib/auth-client';
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
- **n8n Docs:** https://docs.n8n.io
- **Thesys/C1:** (Dokumentation noch zu recherchieren)
- **Neobrutalismus Design:** https://neobrutalism.dev

---

## Quick Start für neue Claude-Sessions

1. **Kontext erfassen:**
   - Lies `masterplan.md` für strategische Vision
   - Lies diese Datei für technische Details
   - Check `app/page.tsx` für aktuellen UI-Stand

2. **Prioritäten:**
   - **Phase 1 MVP** ist aktuelles Ziel
   - Fokus auf: Datenbank-Schema → n8n-Pipeline → Flashcard-UI

3. **Bei neuen Features:**
   - Prüfe Roadmap in diesem Dokument
   - Beachte Neobrutalismus-Design-System
   - Verwende absolute Imports (`@/`)
   - Teste Auth-Flow (Better-Auth)

4. **Bei Fragen:**
   - Datenbank-Schema siehe oben
   - KI-Pipeline-Flow siehe "KI-Pipeline Workflow"
   - Design-Tokens siehe "Design-System"

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

**Letzte Aktualisierung:** 2025-10-10 (Magic Link + Navbar implementiert)
**Projekt-Status:** Phase 0 abgeschlossen, Phase 1 bereit für Datenbank-Migration
