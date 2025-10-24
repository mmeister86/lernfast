# masterplan.md: Die Blaupause für lernfa.st (Aktualisierte Version)

## 1. App-Übersicht und Ziele

**Name:** lernfa.st (Lernen. Schnell. Zugänglich.)

**Kernidee:** Eine moderne Webanwendung, die mithilfe einer kosteneffizienten KI-Pipeline (direkt in Next.js API Routes implementiert) und innovativer Visualisierung (Thesys) komplexe Themen in **visuell ansprechende, mikrodosierte Lernkarten** transformiert. Ziel ist es, die Monotonie traditioneller LLM-Antworten zu durchbrechen und effektives, schnelles Lernen zu ermöglichen.

**Hauptziele (Das "Warum"):**

1. **Effizienz:** Schnelle Einarbeitung in neue Themen ohne stundenlanges Lesen.
2. **Zugänglichkeit:** Bereitstellung von abwechslungsreichen Inhalten, die auch für jüngere Lerner oder Nutzer mit Aufmerksamkeitsdefiziten geeignet sind.
3. **Monetarisierung:** Aufbau eines nachhaltigen Geschäftsmodells durch Premium-Features (Deep Dive).

---

## 2. Zielgruppe & Kernfunktionen

### Zielgruppe

- **Primärnutzer (Fokus):** Entwickler und Berufstätige, die sich schnell in spezifische Nischenthemen einarbeiten müssen (Effizienz-Lerner).
- **Sekundärnutzer:** Junge Lerner (z.B. Schüler), die versäumten Stoff schnell und visuell nachholen müssen.

### Kernfeatures

| Feature-Kategorie        | Beschreibung                                                                                                                                                                         | Monetarisierungszuordnung                                 |
| :----------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------- |
| **Themen-Input**         | Großes, zentrales Suchfeld: _"What do you want to learn today?"_                                                                                                                     | Basis & Premium                                           |
| **KI-Generierung**       | Erstellung themenrelevanter Lernkarten durch die KI-Pipeline (direkt in Next.js API Routes).                                                                                         | **Micro-Dose** (Basis/Limitiert), **Deep Dive** (Premium) |
| **Visuelle Ausgabe**     | Darstellung der Inhalte im **Flashcard-Format**. Antworten werden mithilfe von **Thesys/C1** als visuelle Graphen, Mindmaps oder Diagramme aufbereitet (Design: **Neobrutalismus**). | Basis & Premium                                           |
| **Lern-Tracking**        | Markierung einer Karte als **"Gelernt"** und Speicherung des Fortschritts.                                                                                                           | Basis                                                     |
| **Dashboard/Bibliothek** | Übersicht über alle erstellten Lerneinheiten für schnelle Wiederholung.                                                                                                              | Basis                                                     |
| **Rate Limiting**        | Begrenzung der KI-Aufrufe für Basisnutzer zur Kostenkontrolle.                                                                                                                       | Wichtig für Free-Tier-Management                          |

---

## 3. High-Level Technischer Stack & Architektur

### Frontend & UI

- **Framework:** **Next.js** (für SSR/SEO und API Routes).
- **Styling/Komponenten:** **Neobrutalism.dev UI** für den Look & Feel; **Thesys/C1 + Mermaid.js** für die Visualisierung der Lerninhalte (intelligente KI-gesteuerte Auswahl zwischen 10+ Diagrammtypen).

### Backend & Services (Der Lean-Stack)

| Komponente              | Zweck                                                                                                                 | Empfohlene Lösung                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| **Datenbank & Storage** | Speicherung von Benutzerdaten, Lernfortschritt, Metadaten und visuellen Assets.                                       | **Supabase (PostgreSQL + Storage)**                                  |
| **Authentifizierung**   | Benutzerregistrierung, Login und Session Management.                                                                  | **Better-Auth**                                                      |
| **Email-Validierung**   | Email-Normalisierung und Blockierung von Wegwerf-Domains.                                                             | **Better-Auth-Harmony** (55k+ Domains blockiert)                     |
| **Monetarisierung**     | Abonnement- und Zahlungsverwaltung.                                                                                   | **LemonSqueezy**                                                     |
| **Rate Limiting/Queue** | Begrenzung der KI-Anfragen; Warteschlange.                                                                            | **Upstash (Redis)**                                                  |
| **E-Mail-Dienst**       | Transaktionale E-Mails (Passwort zurücksetzen, Bestätigungen).                                                        | **Resend**                                                           |
| **KI-Pipeline**         | **Der Motor:** Next.js API Routes für Lesson-Generierung. Steuert LLM-Prompting, API-Aufrufe und Datenstrukturierung. | **Next.js API Routes** (`/api/generate-lesson`)                      |
| **KI-Provider**         | Generierung der Rohdaten und der strukturierten JSON-Outputs.                                                         | Kosteneffiziente, externe LLM-API (z.B. OpenAI, Anthropic, DeepSeek) |

- **Hosting:** Startempfehlung ist ein **Serverless Hoster (z.B. Vercel)** für die Next.js-App.

---

## 4. Konzeptionelles Datenmodell (Supabase)

Das Kernmodell ist die **Lerneinheit** (_Lesson_), die aus mehreren **Lernkarten** (_Flashcard_) besteht.

- **Tabelle `User`:** ID (PK), E-Mail, Abo-Status (Free/Premium), `Upstash_RateLimit_ID`.
- **Tabelle `Lesson`:** ID (PK), `User_ID` (FK), `Topic` (Text), `Lesson_Type` (Micro-Dose/Deep Dive), `Created_At`, `Status` (Pending/Completed).
- **Tabelle `Flashcard`:** ID (PK), `Lesson_ID` (FK), `Question` (Text), `Thesys_JSON` (**JSONB** für die visuelle Darstellung), `Is_Learned` (Boolean).
- **Tabelle `Payment_Subscription`:** ID (PK), `User_ID` (FK), `LemonSqueezy_Customer_ID`, `LemonSqueezy_Order_ID`, `Status`, `Plan_Type`, `Variant_ID`.

---

## 5. Entwicklung und Meilensteine

### Phase 1: MVP ✅ ABGESCHLOSSEN (12. Oktober 2025)

1. **Setup:** Next.js 15, Supabase, Better-Auth + Better-Auth-Harmony Integration.
2. **KI-Pipeline (MVP):** Implementierung der Next.js API Route `/api/trigger-lesson` zur Generierung einer **Micro-Dose-Einheit** (3-5 Karten).
   - LLM-Integration (OpenAI GPT-4o-mini) für Flashcard-Generierung
   - Intelligente Visualisierungs-Auswahl (Thesys + Mermaid.js)
   - Prompt Engineering für strukturierte JSON-Outputs mit 10+ Diagrammtypen
   - Direkte Speicherung der generierten Flashcards in Supabase
3. **Visualisierungssystem:** Vollständige Mermaid.js Integration
   - Clientseitiges SVG-Rendering im Browser
   - Automatische Code-Sanitization (sanitizeMermaidCode in lib/utils.ts)
   - Neobrutalismus-Styling mit Custom Theme
   - Support für Flowchart, Mindmap, Sequence, Class/ER, State, Timeline und weitere
4. **Lesson-Verwaltung:** API Routes für Lesson-Status und Fortschritt:
   - `POST /api/trigger-lesson` - Erstellt Lesson + generiert Flashcards mit Visualisierungen
   - `DELETE /api/lesson/delete` - Löscht Lessons
   - `POST /api/flashcard/mark-learned` - Markiert Flashcard als gelernt
5. **UI/UX:**
   - Landing Page mit großem Input-Feld ("What do you want to learn today?")
   - Flashcard-Viewer mit Swipeable Cards im **Neobrutalismus-Stil**
   - User-Dashboard mit Lesson-Übersicht und Status-Badges
   - Profile-Seite mit Benutzereinstellungen
   - Loading Modal mit Hamster-Animation während KI-Generierung
6. **Speicherung:** Vollständige Integration mit Supabase (lesson, flashcard, visualizations JSONB).

### Phase 1.5: Performance-Optimierung ✅ ABGESCHLOSSEN (12. Oktober 2025)

**Ziel:** Drastische Reduzierung der Ladezeiten durch Next.js 15 Caching-Strategie

1. **Next.js 15 `unstable_cache` Integration:**

   - Zentrale gecachte Query-Funktionen in `lib/supabase/queries.ts`
   - `getCachedLessons()` mit 60s Cache für Dashboard (Tag: `lessons`)
   - `getCachedLesson()` mit 300s Cache für Flashcard-Viewer (Tag: `lessons`)
   - `getCachedUserProfile()` mit 120s Cache für Profilseite (Tag: `users`)
   - Tag-basierte Cache-Invalidierung mit statischen Arrays (Next.js 15 Best Practice)

2. **Server Component Optimization:**

   - Dashboard: Umstellung auf gecachte Queries (2000ms → 300ms, **85% schneller**)
   - Lesson-Viewer: Integration mit gecachten Queries (1500ms → 200ms, **87% schneller**)
   - Profilseite: Konvertierung zu Server Component (2000ms → 250ms, **88% schneller**)
   - Neue `ProfileForm` Client Component für Form-Interaktivität

3. **Cache-Invalidierung nach Mutationen:**

   - `POST /api/trigger-lesson` → Invalidiert `lessons` Tag (globale Invalidierung)
   - `POST /api/lesson/delete` → Invalidiert `lessons` Tag (globale Invalidierung)
   - `POST /api/profile/update` → Invalidiert `users` Tag (globale Invalidierung)
   - Verwendung von `revalidateTag()` mit statischen Strings und `revalidatePath()` für Pages

4. **Next.js Config Optimierungen:**
   - `experimental.staleTimes` für Client-Side Caching
   - 30s für dynamische Pages, 180s für statische Pages

**Performance-Ergebnisse:**

- Durchschnittliche Ladezeit-Reduktion: **86%**
- Dashboard: 2000ms → 300ms
- Lesson-Viewer: 1500ms → 200ms
- Profilseite: 2000ms → 250ms

### Phase 2: Monetarisierung und Stabilität (GEPLANT)

1. **Rate Limiting:** Integration von **Upstash** zur Begrenzung der kostenlosen Anfragen (Prüfung innerhalb der `/api/trigger-lesson` Route).
   - Free-Tier: 5 Micro-Doses pro Tag
   - Premium: Unlimitiert + Deep Dive Zugang
2. **Zahlungen:** Integration von **LemonSqueezy** zur Verwaltung des Premium-Abonnements.
   - Monthly Plan: €9.99/Monat
   - Yearly Plan: €99/Jahr (17% Rabatt)
3. **Premium-Feature:** Freischaltung des **Deep Dive** (10-15 Karten) Modus für bezahlte Nutzer in der API Route (via OpenAI o4-mini-deep-research).
4. **E-Mail-Benachrichtigungen:** Erweiterte **Resend**-Integration für Lesson-Completion-Benachrichtigungen.
5. **Topic-basiertes Caching (Optional):**
   - Geteilte Flashcards zwischen Usern für identische Topics
   - Instant Delivery (0ms statt 30s) bei bereits generierten Themen
   - Massive Reduktion der OpenAI API-Kosten

### Phase 3: Optimierung und Skalierung

1. **Asynchrone Verarbeitung:** Umstellung der Lesson-Generierung auf asynchrone Verarbeitung für langwierige Deep Dive-Anfragen:
   - Background Jobs mit Next.js (z.B. via Vercel Cron oder Queue-System)
   - Status-Updates in Echtzeit via Server-Sent Events oder Polling
   - Supabase-Status-Updates während der Generierung
2. **Benachrichtigung:** E-Mail-Versand via Resend, sobald die asynchron generierte Lektion fertig ist ("Dein Essen ist fertig!").
3. **Feinschliff:** Erweiterte Lern-Tracking-Metriken und UX-Optimierung.

---

## 6. Implementierte Visualisierungen (Stand: Oktober 2025)

### Mermaid.js Integration

**Status:** ✅ Vollständig implementiert (clientseitiges Rendering)

Die KI wählt intelligent zwischen verschiedenen Visualisierungstypen:

- **Flowchart** - Prozesse und Abläufe (HTTP Requests, Algorithmen, Build Pipelines)
- **Mindmap** - Themenübersichten (Framework-Landschaften, Kategorisierungen)
- **Sequence** - Interaktionen und Kommunikation (OAuth Flow, API-Kommunikation)
- **Class/ER** - Datenstrukturen und -modelle (Datenbank-Schemas, OOP-Strukturen)
- **Thesys** - Konzeptionelle Zusammenhänge (abstrakte Begriffe, Definitionen)

**Technische Details:**

- Clientseitiges SVG-Rendering (kein Server-Side Puppeteer notwendig)
- Automatische Code-Sanitization (`sanitizeMermaidCode` in `lib/utils.ts`)
- Neobrutalismus-Styling mit Custom Theme (Peach #FFC667, Pink #FB7DA8, Teal #00D9BE, Black borders 4px)
- 10+ unterstützte Diagrammtypen (Flowchart, Mindmap, Sequence, Class, ER, State, Gantt, Pie, Quadrant, Timeline)
- Robuste Fehlerbehandlung mit Fallback-Ansichten

**Visualisierungs-Workflow:**

1. OpenAI wählt basierend auf Lerninhalt passenden Diagrammtyp
2. Mermaid-Code wird serverseitig sanitized und in DB gespeichert (JSONB visualizations Array)
3. Browser rendert SVG on-the-fly mit mermaid.js (Client-Component)
4. Browser-eigenes Caching sorgt für schnelle Wiederholungen

---

## 7. Potentielle Herausforderungen & Lösungen

| Herausforderung           | Problembeschreibung                                                                                           | Strategie/Lösung                                                                                                                                                              |
| :------------------------ | :------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **KI-Prompting-Qualität** | Die KI liefert nicht das exakte JSON-Format, das Thesys erwartet.                                             | **Lösung:** Intensive Iteration und **Few-Shot Prompting** in den Next.js API Routes. Verwendung von Structured Outputs (z.B. OpenAI JSON Mode) für konsistente Datenformate. |
| **Kostenkontrolle**       | Hohe KI-API-Kosten bei zu vielen Free-Tier-Nutzern.                                                           | **Lösung:** Strenge Nutzung von **Upstash Rate Limiting** für alle Nutzer (geprüft in `/api/generate-lesson`) und sofortige Monetarisierung der "Deep Dive"-Funktion.         |
| **API-Timeouts**          | Serverless-Funktionen haben Timeout-Limits (z.B. Vercel: 10s Hobby, 60s Pro). Deep Dive könnte länger dauern. | **Lösung:** Phase 1: Synchrone Verarbeitung nur für Micro-Dose. Phase 3: Asynchrone Background Jobs für Deep Dive mit Status-Updates.                                         |
| **Ladezeiten (UX)**       | Die Generierung von Deep Dive-Einheiten dauert zu lange.                                                      | **Lösung:** Phase 3: Asynchrone Verarbeitung mit Progress-Tracking und E-Mail-Benachrichtigung durch **Resend**.                                                              |

---

## 8. Zukünftige Erweiterungen

- **Spaced Repetition:** Implementierung eines Algorithmus, der Nutzern vorschlägt, wann sie "fast vergessene" Karten wiederholen sollten.
- **Audio-Zusammenfassungen:** Generierung einer kurzen Audio-Zusammenfassung des Themas (TTS-Dienst) für unterwegs.
- **Kollaboratives Lernen:** Teilen von Lerneinheiten mit anderen Nutzern.

---

## Aktueller Projekt-Status (Oktober 2025)

### Abgeschlossen

- ✅ **Phase 0:** Setup & Auth (Better-Auth + Better-Auth-Harmony)
- ✅ **Phase 1:** MVP mit intelligenten Visualisierungen (Mermaid.js + Thesys)
- ✅ **Phase 1.5:** Performance-Optimierung (Next.js 15 Caching - 86% schneller)
- ✅ **Phase 1.5+:** Dialog-Persistierung + Background Story Generation (V1.3)

### In Planung

- 📋 **Phase 2:** Monetarisierung (LemonSqueezy + Upstash Rate Limiting)
- 🚀 **Phase 3:** Erweiterte Optimierung (Asynchrone Verarbeitung, E-Mail-Benachrichtigungen)

### Nächste Schritte

1. **Upstash Redis Integration** für Rate Limiting (Free-Tier: 5 Micro-Doses/Tag)
2. **LemonSqueezy-Integration** für Premium-Abonnements (€9.99/Monat, €99/Jahr)
3. **Deep Dive-Feature** für Premium-Nutzer freischalten (10-15 Karten mit o4-mini-deep-research)
4. **E-Mail-Benachrichtigungen** bei Lesson-Completion (Resend)

### V1.3 - Neue Architektur-Patterns

- **Fire & Forget Pattern**: Background Story Generation während Dialog
- **Light Research**: 2-3s statt 15s Wartezeit nach Topic-Auswahl
- **Dialog-Persistierung**: `dialog_history` Spalte für bessere UX
- **RLS Policy-Fixes**: Service Role Client für robuste DB-Operationen
- **D3.js → Recharts**: Bundle-Size Reduktion um 1MB

### Technologie-Highlights

- **Frontend:** Next.js 15 + React 19 + TypeScript 5
- **Auth:** Better-Auth + Better-Auth-Harmony (55k+ blockierte Wegwerf-Domains)
- **KI:** OpenAI GPT-4o-mini für Flashcard-Generierung
- **Visualisierung:** Mermaid.js (10+ Diagrammtypen) + Thesys für intelligente Darstellung
- **Datenbank:** Supabase (PostgreSQL + Storage)
- **Caching:** Next.js 15 `unstable_cache` mit Tag-basierter Invalidierung
- **E-Mail:** Resend für transaktionale E-Mails
- **Styling:** Tailwind CSS + Neobrutalismus Design System
- **Package Manager:** pnpm

### Performance-Metriken (Phase 1.5)

- **Dashboard-Ladezeit:** 2000ms → 300ms (**85% Reduktion**)
- **Lesson-Viewer:** 1500ms → 200ms (**87% Reduktion**)
- **Profilseite:** 2000ms → 250ms (**88% Reduktion**)
- **Durchschnitt:** 1833ms → 250ms (**86% schneller**)

### Performance-Metriken (Phase 1.5+ - V1.3)

- **Initial-Ladezeit:** 15-30s → 2-3s (**83-90% Reduktion**)
- **Dialog-Start:** Sofortiger Start (keine Wartezeit)
- **Story-Übergang:** Nahtlos (Background Generation)
- **Bundle-Size:** -1MB (D3.js → Recharts Migration)
