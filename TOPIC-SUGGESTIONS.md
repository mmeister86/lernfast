# TOPIC-SUGGESTIONS.md - Topic Suggestion System

> **Dokumentation für das KI-gestützte Topic Suggestion System von lernfa.st**

## Übersicht

Das **Topic Suggestion System** hilft Usern dabei, präzisere und besser strukturierte Lernthemen zu formulieren. Wenn ein User ein grobes Thema eingibt (z.B. "React"), generiert die KI **3 verfeinerte Vorschläge** mit Emoji, Titel und Beschreibung.

**Status:** ✅ Vollständig implementiert (2025-10-15)

---

## Warum Topic Suggestions?

### Problem

User geben oft **zu vage Themen** ein:
- ❌ "React" (zu breit)
- ❌ "Machine Learning" (zu allgemein)
- ❌ "JavaScript" (zu unspezifisch)

Dies führt zu:
- Unstrukturierten Lerninhalten
- Überwältigend viele Informationen
- Schlechter Lernfokus

### Lösung

Die KI verfeinert das Thema in **3 konkrete Lernziele**:
- ✅ "React Hooks Grundlagen" (fokussiert)
- ✅ "React State Management - Context vs Redux" (vergleichend)
- ✅ "React Performance-Optimierung mit Memoization" (fortgeschritten)

---

## Workflow

```
User gibt grobes Thema ein (z.B. "React")
    ↓
Frontend öffnet Topic Selection Modal
    ↓
POST /api/suggest-topics
  {
    topic: "React",
    lessonType: "micro_dose"
  }
    ↓
OpenAI (OPENAI_SELECTION_MODEL = gpt-4o-mini)
  - Analysiert User-Input
  - Generiert 3 verfeinerte Vorschläge
  - Fügt passende Emojis hinzu
    ↓
Response: {
  suggestions: [
    { emoji: "⚛️", title: "...", description: "..." },
    { emoji: "🎨", title: "...", description: "..." },
    { emoji: "🔄", title: "...", description: "..." }
  ]
}
    ↓
User wählt einen Vorschlag aus
    ↓
lesson.refined_topic = ausgewählter Titel
    ↓
Weiter zu /api/trigger-lesson
```

---

## API Endpoint

### Request

**Route:** `POST /api/suggest-topics`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <session_token>
```

**Body:**
```typescript
{
  topic: string;           // Grobes Thema (z.B. "React")
  lessonType: "micro_dose" | "deep_dive";
}
```

**Beispiel:**
```json
{
  "topic": "React",
  "lessonType": "micro_dose"
}
```

### Response

**Success (200 OK):**
```typescript
{
  suggestions: Array<{
    emoji: string;         // z.B. "⚛️"
    title: string;         // z.B. "React Hooks Grundlagen"
    description: string;   // z.B. "Lerne useState, useEffect und Custom Hooks"
  }>;
}
```

**Beispiel:**
```json
{
  "suggestions": [
    {
      "emoji": "⚛️",
      "title": "React Hooks Grundlagen",
      "description": "Lerne useState, useEffect und Custom Hooks in 5 Minuten"
    },
    {
      "emoji": "🎨",
      "title": "React Styling-Strategien",
      "description": "CSS Modules, Styled Components und Tailwind im Vergleich"
    },
    {
      "emoji": "🔄",
      "title": "React State Management",
      "description": "Context API vs Redux - Wann nutze ich was?"
    }
  ]
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Topic ist erforderlich"
}
```

**Error (401 Unauthorized):**
```json
{
  "error": "Authentifizierung erforderlich"
}
```

**Error (500 Internal Server Error):**
```json
{
  "error": "Fehler bei Topic-Generierung: <details>"
}
```

---

## Prompt Engineering

### System Prompt

```
Du bist ein Experte für Lern-Design und hilfst Usern, präzise Lernthemen zu formulieren.

Deine Aufgabe:
- Generiere GENAU 3 verfeinerte Topic-Vorschläge basierend auf dem User-Input
- Jeder Vorschlag muss ein passendes Emoji haben
- Titel: Kurz & prägnant (max. 50 Zeichen)
- Beschreibung: Konkret & lernzielorientiert (max. 100 Zeichen)

Anpassung an lessonType:
- "micro_dose": Fokus auf Grundlagen, schnelle Einführungen, Überblicke
- "deep_dive": Fokus auf fortgeschrittene Themen, Vergleiche, Best Practices
```

### User Prompt Template

```typescript
const userPrompt = `
Generiere 3 verfeinerte Lernthemen für: "${topic}"

Lesson-Typ: ${lessonType}

Format (JSON):
{
  "suggestions": [
    {
      "emoji": "...",
      "title": "...",
      "description": "..."
    }
  ]
}
`;
```

### Few-Shot Examples

**Input:** "JavaScript"
**Output (micro_dose):**
```json
{
  "suggestions": [
    {
      "emoji": "🔤",
      "title": "JavaScript Basics - Variablen & Datentypen",
      "description": "let, const, var und primitive Datentypen verstehen"
    },
    {
      "emoji": "🔄",
      "title": "JavaScript Schleifen & Bedingungen",
      "description": "if/else, for, while und switch-Statements meistern"
    },
    {
      "emoji": "📦",
      "title": "JavaScript Funktionen & Arrow Functions",
      "description": "Funktionsdeklarationen und moderne Syntax lernen"
    }
  ]
}
```

**Input:** "Machine Learning"
**Output (deep_dive):**
```json
{
  "suggestions": [
    {
      "emoji": "🤖",
      "title": "Supervised vs Unsupervised Learning",
      "description": "Unterschiede, Anwendungsfälle und Algorithmen-Vergleich"
    },
    {
      "emoji": "📊",
      "title": "Feature Engineering Best Practices",
      "description": "Daten aufbereiten, Normalisierung und Feature-Selektion"
    },
    {
      "emoji": "🎯",
      "title": "Model Evaluation Metrics",
      "description": "Accuracy, Precision, Recall, F1-Score richtig interpretieren"
    }
  ]
}
```

---

## Komponenten

### Frontend: Topic Selection Modal

**Datei:** `components/landing/topic-selection-modal.tsx`

**Features:**
- Modal-Dialog mit glassmorphism Design
- 3 Suggestion-Cards mit Hover-Effekt
- Loading State während API-Call
- Error Handling mit Toast-Notifications
- "Überspringen"-Button für direkten Lesson-Start

**Verwendung:**
```tsx
import { TopicSelectionModal } from '@/components/landing/topic-selection-modal';

<TopicSelectionModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  topic="React"
  lessonType="micro_dose"
  onSelectTopic={(refinedTopic) => {
    // User hat einen Vorschlag ausgewählt
    createLesson({ topic: refinedTopic, lessonType });
  }}
/>
```

### Backend: API Route

**Datei:** `app/api/suggest-topics/route.ts`

**Implementation:**
```typescript
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/lib/auth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  // 1. Auth Check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse Request
  const { topic, lessonType } = await request.json();
  if (!topic) {
    return NextResponse.json({ error: 'Topic required' }, { status: 400 });
  }

  // 3. OpenAI API Call
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_SELECTION_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 500,
    response_format: { type: 'json_object' }
  });

  // 4. Parse & Validate Response
  const suggestions = JSON.parse(response.choices[0].message.content);

  // 5. Return Suggestions
  return NextResponse.json({ suggestions: suggestions.suggestions });
}
```

---

## Model-Konfiguration

### Verwendetes Model

**ENV-Variable:** `OPENAI_SELECTION_MODEL`
**Empfohlen:** `gpt-4o-mini`

**Begründung:**
- ✅ **Schnell** - Niedrige Latenz (~1-2s)
- ✅ **Günstig** - $0.150 / 1M input tokens
- ✅ **Ausreichend** - Einfache Text-Generierung
- ✅ **JSON Mode** - Native JSON-Output-Support

### Alternative Models

| Model | Pro | Contra | Use Case |
|-------|-----|--------|----------|
| `gpt-4o` | Beste Qualität | Teurer, langsamer | Premium-Users |
| `gpt-3.5-turbo` | Sehr günstig | Schlechtere Qualität | Cost-Saving |
| `o1-mini` | Reasoning | Keine JSON Mode | Nicht geeignet |

---

## Beispiele

### Beispiel 1: React (Micro-Dose)

**Input:**
```json
{
  "topic": "React",
  "lessonType": "micro_dose"
}
```

**Output:**
```json
{
  "suggestions": [
    {
      "emoji": "⚛️",
      "title": "React Hooks Grundlagen",
      "description": "Lerne useState, useEffect und Custom Hooks in 5 Minuten"
    },
    {
      "emoji": "🎨",
      "title": "React Komponenten-Basics",
      "description": "Funktionale Komponenten und Props verstehen"
    },
    {
      "emoji": "🔄",
      "title": "React State Management Intro",
      "description": "State, setState und Lifting State Up"
    }
  ]
}
```

### Beispiel 2: Quantum Computing (Deep-Dive)

**Input:**
```json
{
  "topic": "Quantum Computing",
  "lessonType": "deep_dive"
}
```

**Output:**
```json
{
  "suggestions": [
    {
      "emoji": "⚛️",
      "title": "Quantum Gates & Circuits",
      "description": "Hadamard, CNOT, Pauli-Gates und Schaltungen im Detail"
    },
    {
      "emoji": "🔬",
      "title": "Quantum Algorithms - Shor & Grover",
      "description": "Faktorisierung und Datenbanksuche mit Quantenalgorithmen"
    },
    {
      "emoji": "💻",
      "title": "Quantum Programming mit Qiskit",
      "description": "Praktische Quantenprogrammierung in Python"
    }
  ]
}
```

### Beispiel 3: UI/UX Design (Micro-Dose)

**Input:**
```json
{
  "topic": "UI/UX Design",
  "lessonType": "micro_dose"
}
```

**Output:**
```json
{
  "suggestions": [
    {
      "emoji": "🎨",
      "title": "Design Principles - 5 Grundregeln",
      "description": "Contrast, Repetition, Alignment, Proximity, Balance"
    },
    {
      "emoji": "📱",
      "title": "Mobile-First Design",
      "description": "Responsive Design für optimale Mobile-UX"
    },
    {
      "emoji": "🖼️",
      "title": "Color Theory für UI-Design",
      "description": "Farbpsychologie, Harmonien und Accessibility"
    }
  ]
}
```

---

## Performance & Kosten

### Latenz

**Typische Response-Zeit:**
- OpenAI API Call: ~1-2 Sekunden
- JSON Parsing: <10ms
- Gesamt: **~1.5-2.5 Sekunden**

**Optimierungen:**
- Nutze `gpt-4o-mini` (schneller als `gpt-4o`)
- `max_tokens: 500` (limitiert Output-Länge)
- `temperature: 0.7` (Balance zwischen Kreativität & Konsistenz)

### Kosten

**Pro Suggestion-Request:**
- Input Tokens: ~300 tokens (System + User Prompt)
- Output Tokens: ~150 tokens (3 Suggestions)
- **Gesamt: ~450 tokens**

**Kosten mit gpt-4o-mini:**
- Input: $0.150 / 1M tokens → $0.000045 pro Request
- Output: $0.600 / 1M tokens → $0.00009 pro Request
- **Gesamt: ~$0.000135 pro Request (~$0.14 pro 1000 Requests)**

**Hochrechnung:**
- 10,000 Users/Monat → ~$1.35/Monat
- 100,000 Users/Monat → ~$13.50/Monat

→ **Sehr kosteneffizient!**

---

## Error Handling

### Client-Side

```typescript
try {
  const response = await fetch('/api/suggest-topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, lessonType })
  });

  if (!response.ok) {
    throw new Error('Failed to fetch suggestions');
  }

  const { suggestions } = await response.json();
  setSuggestions(suggestions);
} catch (error) {
  console.error('Topic Suggestions Error:', error);
  toast.error('Fehler beim Laden der Vorschläge. Bitte versuche es erneut.');
}
```

### Server-Side

```typescript
try {
  const response = await openai.chat.completions.create({...});
  const suggestions = JSON.parse(response.choices[0].message.content);

  // Validiere Response
  if (!suggestions.suggestions || suggestions.suggestions.length !== 3) {
    throw new Error('Invalid OpenAI response format');
  }

  return NextResponse.json({ suggestions: suggestions.suggestions });
} catch (error) {
  console.error('OpenAI API Error:', error);
  return NextResponse.json(
    { error: 'Fehler bei Topic-Generierung' },
    { status: 500 }
  );
}
```

---

## Testing

### Manual Testing

```bash
# 1. Start Dev Server
pnpm dev

# 2. Teste API Endpoint
curl -X POST http://localhost:3000/api/suggest-topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session_token>" \
  -d '{"topic": "React", "lessonType": "micro_dose"}'

# 3. Prüfe Response Format
# Sollte 3 Suggestions mit emoji, title, description zurückgeben
```

### Automated Testing (Beispiel)

```typescript
import { POST } from '@/app/api/suggest-topics/route';

describe('/api/suggest-topics', () => {
  it('should return 3 suggestions for valid input', async () => {
    const request = new Request('http://localhost:3000/api/suggest-topics', {
      method: 'POST',
      body: JSON.stringify({ topic: 'React', lessonType: 'micro_dose' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.suggestions).toHaveLength(3);
    expect(data.suggestions[0]).toHaveProperty('emoji');
    expect(data.suggestions[0]).toHaveProperty('title');
    expect(data.suggestions[0]).toHaveProperty('description');
  });

  it('should return 400 for missing topic', async () => {
    const request = new Request('http://localhost:3000/api/suggest-topics', {
      method: 'POST',
      body: JSON.stringify({ lessonType: 'micro_dose' })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

---

## Zukünftige Erweiterungen

### 1. User-spezifische Suggestions

**Idee:** Personalisiere Vorschläge basierend auf User-Profil

```typescript
const userContext = {
  experienceLevel: session.user.experienceLevel, // "beginner" | "intermediate" | "expert"
  preferredDifficulty: session.user.preferredDifficulty,
  previousTopics: await getUserTopics(session.user.id)
};

// Passe System Prompt an User-Context an
const systemPrompt = `
Du bist ein Experte für Lern-Design.
User-Level: ${userContext.experienceLevel}
Bereits gelernte Themen: ${userContext.previousTopics.join(', ')}
`;
```

### 2. Topic-Trending

**Idee:** Zeige populäre Topics an

```typescript
// Tracke häufigste Topics
const trendingTopics = await db.query(`
  SELECT refined_topic, COUNT(*) as count
  FROM lesson
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY refined_topic
  ORDER BY count DESC
  LIMIT 5
`);

// Zeige in Modal: "🔥 Trending: React Hooks, Machine Learning, ..."
```

### 3. AI-gestützte Topic-Kategorisierung

**Idee:** Kategorisiere Topics automatisch

```typescript
const categories = ['Programming', 'Design', 'Data Science', 'Business', 'Languages'];

// Tool Call: categorize_topic
const category = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'Kategorisiere das Thema in eine der Kategorien' },
    { role: 'user', content: `Topic: ${topic}` }
  ],
  tools: [{
    type: 'function',
    function: {
      name: 'categorize_topic',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: categories }
        }
      }
    }
  }]
});
```

---

## Troubleshooting

### Problem: Keine Suggestions generiert

**Mögliche Ursachen:**
1. `OPENAI_API_KEY` nicht gesetzt → Check `.env.local`
2. OpenAI API Quota erreicht → Check Dashboard
3. Falsches Model-Format → Check `OPENAI_SELECTION_MODEL`

**Lösung:**
```bash
# Prüfe ENV-Variablen
echo $OPENAI_API_KEY
echo $OPENAI_SELECTION_MODEL

# Test API Key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Problem: Response-Format ungültig

**Mögliche Ursachen:**
1. OpenAI liefert Text statt JSON
2. JSON-Parsing-Fehler

**Lösung:**
```typescript
// Erzwinge JSON Mode
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  response_format: { type: 'json_object' }, // ✅ Wichtig!
  messages: [...]
});

// Fallback-Parsing
let suggestions;
try {
  suggestions = JSON.parse(response.choices[0].message.content);
} catch (error) {
  console.error('JSON Parse Error:', error);
  // Fallback: Nutze Regex oder Default-Suggestions
  suggestions = defaultSuggestions;
}
```

---

## Siehe auch

- **[CLAUDE.md](./CLAUDE.md)** - Gesamt-Überblick über die Codebase
- **[INTERACTIVE-LEARNING.md](./INTERACTIVE-LEARNING.md)** - 3-Phasen-Lernsystem
- **OpenAI JSON Mode Docs:** https://platform.openai.com/docs/guides/json-mode

---

**Letzte Aktualisierung:** 2025-10-16
**Status:** ✅ Vollständig implementiert
**Autor:** lernfa.st Team
