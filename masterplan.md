# masterplan.md: Die Blaupause für lernfa.st (Aktualisierte Version)

## 1. App-Übersicht und Ziele

**Name:** lernfa.st (Lernen. Schnell. Zugänglich.)

**Kernidee:** Eine moderne Webanwendung, die mithilfe einer kosteneffizienten KI-Pipeline (gesteuert durch n8n) und innovativer Visualisierung (Thesys) komplexe Themen in **visuell ansprechende, mikrodosierte Lernkarten** transformiert. Ziel ist es, die Monotonie traditioneller LLM-Antworten zu durchbrechen und effektives, schnelles Lernen zu ermöglichen.

**Hauptziele (Das "Warum"):**
1. **Effizienz:** Schnelle Einarbeitung in neue Themen ohne stundenlanges Lesen.
2. **Zugänglichkeit:** Bereitstellung von abwechslungsreichen Inhalten, die auch für jüngere Lerner oder Nutzer mit Aufmerksamkeitsdefiziten geeignet sind.
3. **Monetarisierung:** Aufbau eines nachhaltigen Geschäftsmodells durch Premium-Features (Deep Dive).

---

## 2. Zielgruppe & Kernfunktionen

### Zielgruppe
* **Primärnutzer (Fokus):** Entwickler und Berufstätige, die sich schnell in spezifische Nischenthemen einarbeiten müssen (Effizienz-Lerner).
* **Sekundärnutzer:** Junge Lerner (z.B. Schüler), die versäumten Stoff schnell und visuell nachholen müssen.

### Kernfeatures
| Feature-Kategorie | Beschreibung | Monetarisierungszuordnung |
| :--- | :--- | :--- |
| **Themen-Input** | Großes, zentrales Suchfeld: *"What do you want to learn today?"* | Basis & Premium |
| **KI-Generierung** | Erstellung themenreleventer Lernkarten durch die KI-Pipeline (ausgelöst via Webhook). | **Micro-Dose** (Basis/Limitiert), **Deep Dive** (Premium) |
| **Visuelle Ausgabe** | Darstellung der Inhalte im **Flashcard-Format**. Antworten werden mithilfe von **Thesys/C1** als visuelle Graphen, Mindmaps oder Diagramme aufbereitet (Design: **Neobrutalismus**). | Basis & Premium |
| **Lern-Tracking** | Markierung einer Karte als **"Gelernt"** und Speicherung des Fortschritts. | Basis |
| **Dashboard/Bibliothek** | Übersicht über alle erstellten Lerneinheiten für schnelle Wiederholung. | Basis |
| **Rate Limiting** | Begrenzung der KI-Aufrufe für Basisnutzer zur Kostenkontrolle. | Wichtig für Free-Tier-Management |

---

## 3. High-Level Technischer Stack & Architektur

### Frontend & UI
* **Framework:** **Next.js** (für SSR/SEO und API Routes).
* **Styling/Komponenten:** **Neobrutalism.dev UI** für den Look & Feel; **Thesys/C1** für die Visualisierung der Lerninhalte.

### Backend & Services (Der Lean-Stack)
| Komponente | Zweck | Empfohlene Lösung |
| :--- | :--- | :--- |
| **Datenbank & Storage** | Speicherung von Benutzerdaten, Lernfortschritt, Metadaten und visuellen Assets. | **Supabase (PostgreSQL + Storage)** |
| **Authentifizierung** | Benutzerregistrierung, Login und Session Management. | **Better-Auth** |
| **Monetarisierung** | Abonnement- und Zahlungsverwaltung. | **Stripe** |
| **Rate Limiting/Queue** | Begrenzung der KI-Anfragen; Warteschlange. | **Upstash (Redis)** |
| **E-Mail-Dienst** | Transaktionale E-Mails (Passwort zurücksetzen, Bestätigungen). | **Resend** |
| **KI-Orchestrator** | **Der Motor:** Steuert den gesamten KI-Workflow (Prompting, API-Aufrufe, Datenstrukturierung). | **n8n Workflow** (Ausgelöst via Webhook) |
| **Triggerpunkt** | Startet den n8n-Workflow und übergibt die Eingabedaten. | **Next.js API Route (Webhook-Client)** |
| **KI-Provider** | Generierung der Rohdaten und der strukturierten JSON-Outputs. | Kosteneffiziente, externe LLM-API (z.B. `04-mini-deepresearch`) |
* **Hosting:** Startempfehlung ist ein **Serverless Hoster (z.B. Vercel)** für die Next.js-App.

---

## 4. Konzeptionelles Datenmodell (Supabase)

Das Kernmodell ist die **Lerneinheit** (*Lesson*), die aus mehreren **Lernkarten** (*Flashcard*) besteht.

* **Tabelle `User`:** ID (PK), E-Mail, Abo-Status (Free/Premium), `Upstash_RateLimit_ID`.
* **Tabelle `Lesson`:** ID (PK), `User_ID` (FK), `Topic` (Text), `Lesson_Type` (Micro-Dose/Deep Dive), `Created_At`, `Status` (Pending/Completed).
* **Tabelle `Flashcard`:** ID (PK), `Lesson_ID` (FK), `Question` (Text), `Thesys_JSON` (**JSONB** für die visuelle Darstellung), `Is_Learned` (Boolean).
* **Tabelle `Payment_Subscription`:** ID (PK), `User_ID` (FK), `Stripe_ID`, `Status`, `Plan_Type`.

---

## 5. Entwicklung und Meilensteine

### Phase 1: MVP (Minimum Viable Product)
1. **Setup:** Next.js, Supabase, Better-Auth Integration.
2. **KI-Pipeline (MVP):** Aufbau des n8n-Workflows zur Generierung einer **Micro-Dose-Einheit** (3-5 Karten).
3. **Trigger-Integration:** Implementierung der Next.js API Route, die den n8n-Webhook auslöst und die *Lesson*-Datenbankeinträge erstellt.
4. **UI/UX:** Basis-Input-Feld, Darstellung der generierten Karten im **Neobrutalismus-Stil** mit Thesys/C1.
5. **Speicherung:** Speichern der Lerneinheit in Supabase und Anzeige im einfachen User-Dashboard.

### Phase 2: Monetarisierung und Stabilität
1. **Rate Limiting:** Integration von **Upstash** zur Begrenzung der kostenlosen Anfragen (Prüfung innerhalb der Next.js Trigger-Route).
2. **Zahlungen:** Integration von **Stripe** zur Verwaltung des Premium-Abonnements.
3. **Premium-Feature:** Freischaltung des **Deep Dive** (10-15 Karten) Workflows für bezahlte Nutzer.
4. **E-Mail-Integration:** Anbindung von **Resend** für Auth-E-Mails und Benachrichtigungen.

### Phase 3: Optimierung und Skalierung
1. **Asynchrone Verarbeitung:** Nutzung der n8n-Struktur, um langwierige Deep Dive-Anfragen *asynchron* zu verarbeiten. Der Webhook triggert den n8n-Workflow, n8n aktualisiert Supabase nach Fertigstellung.
2. **Benachrichtigung:** E-Mail-Versand via Resend, sobald die asynchron generierte Lektion fertig ist ("Dein Essen ist fertig!").
3. **Feinschliff:** Erweiterte Lern-Tracking-Metriken und UX-Optimierung.

---

## 6. Potentielle Herausforderungen & Lösungen

| Herausforderung | Problembeschreibung | Strategie/Lösung |
| :--- | :--- | :--- |
| **KI-Prompting-Qualität** | Die KI liefert nicht das exakte JSON-Format, das Thesys erwartet. | **Lösung:** Intensive Iteration und **Few-Shot Prompting** innerhalb des **n8n-Workflows**, um der KI beizubringen, *nur* den gewünschten JSON-Output zu liefern. |
| **Kostenkontrolle** | Hohe KI-API-Kosten bei zu vielen Free-Tier-Nutzern. | **Lösung:** Strenge Nutzung von **Upstash Rate Limiting** für alle Nutzer (geprüft im Next.js-Trigger) und sofortige Monetarisierung der "Deep Dive"-Funktion. |
| **Komplexität (n8n)** | Der n8n-Workflow wird sehr komplex und schwer zu warten. | **Lösung:** Strukturierte, modulare Workflows in n8n. Dokumentation des Prompt-Engineering innerhalb von n8n. |
| **Ladezeiten (UX)** | Die Generierung von Deep Dive-Einheiten dauert zu lange. | **Lösung:** Nutzung der n8n-Asynchronität und E-Mail-Benachrichtigung durch **Resend**. |

---

## 7. Zukünftige Erweiterungen

* **Spaced Repetition:** Implementierung eines Algorithmus, der Nutzern vorschlägt, wann sie "fast vergessene" Karten wiederholen sollten.
* **Audio-Zusammenfassungen:** Generierung einer kurzen Audio-Zusammenfassung des Themas (TTS-Dienst) für unterwegs.
* **Kollaboratives Lernen:** Teilen von Lerneinheiten mit anderen Nutzern.