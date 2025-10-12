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
- **Styling/Komponenten:** **Neobrutalism.dev UI** für den Look & Feel; **Thesys/C1** für die Visualisierung der Lerninhalte.

### Backend & Services (Der Lean-Stack)

| Komponente                   | Zweck                                                                                                                 | Empfohlene Lösung                                                    |
| :--------------------------- | :-------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| **Datenbank & Storage**      | Speicherung von Benutzerdaten, Lernfortschritt, Metadaten und visuellen Assets.                                       | **Supabase (PostgreSQL + Storage)**                                  |
| **Authentifizierung**        | Benutzerregistrierung, Login und Session Management.                                                                  | **Better-Auth**                                                      |
| **Email-Validierung**        | Email-Normalisierung und Blockierung von Wegwerf-Domains.                                                            | **Better-Auth-Harmony** (55k+ Domains blockiert)                     |
| **Monetarisierung**          | Abonnement- und Zahlungsverwaltung.                                                                                   | **Stripe**                                                           |
| **Rate Limiting/Queue**      | Begrenzung der KI-Anfragen; Warteschlange.                                                                            | **Upstash (Redis)**                                                  |
| **E-Mail-Dienst**            | Transaktionale E-Mails (Passwort zurücksetzen, Bestätigungen).                                                        | **Unsend**                                                           |
| **KI-Pipeline**              | **Der Motor:** Next.js API Routes für Lesson-Generierung. Steuert LLM-Prompting, API-Aufrufe und Datenstrukturierung. | **Next.js API Routes** (`/api/generate-lesson`)                      |
| **KI-Provider**              | Generierung der Rohdaten und der strukturierten JSON-Outputs.                                                         | Kosteneffiziente, externe LLM-API (z.B. OpenAI, Anthropic, DeepSeek) |

- **Hosting:** Startempfehlung ist ein **Serverless Hoster (z.B. Vercel)** für die Next.js-App.

---

## 4. Konzeptionelles Datenmodell (Supabase)

Das Kernmodell ist die **Lerneinheit** (_Lesson_), die aus mehreren **Lernkarten** (_Flashcard_) besteht.

- **Tabelle `User`:** ID (PK), E-Mail, Abo-Status (Free/Premium), `Upstash_RateLimit_ID`.
- **Tabelle `Lesson`:** ID (PK), `User_ID` (FK), `Topic` (Text), `Lesson_Type` (Micro-Dose/Deep Dive), `Created_At`, `Status` (Pending/Completed).
- **Tabelle `Flashcard`:** ID (PK), `Lesson_ID` (FK), `Question` (Text), `Thesys_JSON` (**JSONB** für die visuelle Darstellung), `Is_Learned` (Boolean).
- **Tabelle `Payment_Subscription`:** ID (PK), `User_ID` (FK), `Stripe_ID`, `Status`, `Plan_Type`.

---

## 5. Entwicklung und Meilensteine

### Phase 1: MVP (Minimum Viable Product)

1. **Setup:** Next.js, Supabase, Better-Auth Integration.
2. **KI-Pipeline (MVP):** Implementierung der Next.js API Route `/api/generate-lesson` zur Generierung einer **Micro-Dose-Einheit** (3-5 Karten).
   - LLM-Integration (OpenAI GPT-5-Mini) für Flashcard-Generierung
   - Prompt Engineering für strukturierte JSON-Outputs (Thesys/C1-Format)
   - Direkte Speicherung der generierten Flashcards in Supabase
3. **Lesson-Verwaltung:** API Routes für Lesson-Status und Fortschritt:
   - `POST /api/generate-lesson` - Erstellt Lesson + generiert Flashcards
   - `GET /api/lessons` - Listet alle Lessons des Users
   - `GET /api/lessons/[id]` - Holt einzelne Lesson mit Flashcards
   - `PATCH /api/flashcards/[id]` - Markiert Flashcard als gelernt
4. **UI/UX:** Basis-Input-Feld, Darstellung der generierten Karten im **Neobrutalismus-Stil** mit Thesys/C1.
5. **Speicherung:** Speichern der Lerneinheit in Supabase und Anzeige im einfachen User-Dashboard.

### Phase 2: Monetarisierung und Stabilität

1. **Rate Limiting:** Integration von **Upstash** zur Begrenzung der kostenlosen Anfragen (Prüfung innerhalb der `/api/generate-lesson` Route).
2. **Zahlungen:** Integration von **Stripe** zur Verwaltung des Premium-Abonnements.
3. **Premium-Feature:** Freischaltung des **Deep Dive** (10-15 Karten) Modus für bezahlte Nutzer in der API Route (via OpenAI o4-mini-deep-research).
4. **E-Mail-Benachrichtigungen:** Erweiterte **Unsend**-Integration für Lesson-Completion-Benachrichtigungen.

### Phase 3: Optimierung und Skalierung

1. **Asynchrone Verarbeitung:** Umstellung der Lesson-Generierung auf asynchrone Verarbeitung für langwierige Deep Dive-Anfragen:
   - Background Jobs mit Next.js (z.B. via Vercel Cron oder Queue-System)
   - Status-Updates in Echtzeit via Server-Sent Events oder Polling
   - Supabase-Status-Updates während der Generierung
2. **Benachrichtigung:** E-Mail-Versand via Unsend, sobald die asynchron generierte Lektion fertig ist ("Dein Essen ist fertig!").
3. **Feinschliff:** Erweiterte Lern-Tracking-Metriken und UX-Optimierung.

---

## 6. Potentielle Herausforderungen & Lösungen

| Herausforderung           | Problembeschreibung                                                                                           | Strategie/Lösung                                                                                                                                                              |
| :------------------------ | :------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **KI-Prompting-Qualität** | Die KI liefert nicht das exakte JSON-Format, das Thesys erwartet.                                             | **Lösung:** Intensive Iteration und **Few-Shot Prompting** in den Next.js API Routes. Verwendung von Structured Outputs (z.B. OpenAI JSON Mode) für konsistente Datenformate. |
| **Kostenkontrolle**       | Hohe KI-API-Kosten bei zu vielen Free-Tier-Nutzern.                                                           | **Lösung:** Strenge Nutzung von **Upstash Rate Limiting** für alle Nutzer (geprüft in `/api/generate-lesson`) und sofortige Monetarisierung der "Deep Dive"-Funktion.         |
| **API-Timeouts**          | Serverless-Funktionen haben Timeout-Limits (z.B. Vercel: 10s Hobby, 60s Pro). Deep Dive könnte länger dauern. | **Lösung:** Phase 1: Synchrone Verarbeitung nur für Micro-Dose. Phase 3: Asynchrone Background Jobs für Deep Dive mit Status-Updates.                                         |
| **Ladezeiten (UX)**       | Die Generierung von Deep Dive-Einheiten dauert zu lange.                                                      | **Lösung:** Phase 3: Asynchrone Verarbeitung mit Progress-Tracking und E-Mail-Benachrichtigung durch **Unsend**.                                                              |

---

## 7. Zukünftige Erweiterungen

- **Spaced Repetition:** Implementierung eines Algorithmus, der Nutzern vorschlägt, wann sie "fast vergessene" Karten wiederholen sollten.
- **Audio-Zusammenfassungen:** Generierung einer kurzen Audio-Zusammenfassung des Themas (TTS-Dienst) für unterwegs.
- **Kollaboratives Lernen:** Teilen von Lerneinheiten mit anderen Nutzern.
