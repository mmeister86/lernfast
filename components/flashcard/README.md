# Flashcard Components

Komponenten für die Anzeige und Interaktion mit Flashcards.

## Komponenten

### `FlashcardViewer`
**Client Component** - Carousel-Navigation durch Flashcards

**Features:**
- Vor/Zurück-Navigation
- Keyboard-Support (Pfeiltasten ← → zum Navigieren, Leertaste zum Umdrehen)
- Fortschrittsanzeige (X von Y + Progress Bar)
- Zurück zum Dashboard-Button
- Empty State wenn keine Flashcards vorhanden

**Props:**
```typescript
{
  lesson: Lesson;
  flashcards: Flashcard[];
}
```

### `Flashcard`
**Client Component** - Einzelne Flashcard mit Flip-Animation

**Features:**
- 3D-Flip-Animation beim Klick
- Vorderseite: Frage (großer Text, zentriert, weiß)
- Rückseite: Thesys-JSON-Visualisierung (teal background)
- Neobrutalismus-Design (15px radius, 8px shadow, 4px border)
- Fallback für Karten ohne Thesys-JSON

**Props:**
```typescript
{
  flashcard: FlashcardType;
  isFlipped: boolean;
  onFlip: () => void;
}
```

## Thesys-Visualisierung

Aktuell wird Thesys-JSON **vereinfacht** dargestellt:
- Nodes als farbige Karten (je nach Type: concept/detail/example/definition)
- Edges als Text-Liste der Verbindungen

**TODO (Phase 2):**
- Integration echter Thesys/C1 Rendering-Library für Graphen/Mindmaps
- Interaktive Zoom/Pan-Funktionen
- Force-Directed Layout

## Usage

```tsx
import { FlashcardViewer } from '@/components/flashcard/flashcard-viewer';

// In Server Component (z.B. app/lesson/[id]/page.tsx)
<FlashcardViewer lesson={lesson} flashcards={flashcards} />
```

## Styling

Alle Komponenten folgen dem **Neobrutalism-Design**:
- Border Radius: `rounded-[15px]`
- Borders: `border-4 border-black`
- Shadows: `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`
- Colors: Retro Palette (Peach #FFC667, Pink #FB7DA8, Teal #00D9BE)
- Fonts: `font-extrabold` für Fragen, `font-medium` für Body

## 3D Flip Animation

Die Flip-Animation nutzt CSS 3D Transforms:
- `transform-style: preserve-3d` auf Container
- `backface-visibility: hidden` auf Front/Back
- `rotateY(180deg)` für Flip-Effekt
- 500ms Transition Duration

Custom CSS-Classes in `app/globals.css`:
- `.rotate-y-180`
- `.transform-style-preserve-3d`
- `.backface-hidden`
- `.perspective-1000`

