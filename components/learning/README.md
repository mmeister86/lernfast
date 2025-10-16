# Interactive Learning Components

Dieses Verzeichnis enthält alle Komponenten für den 3-Phasen-Lern-Workflow.

## Komponenten-Übersicht

### 1. `dialog-phase.tsx`

**Dialog-Phase**: KI-gesteuerter Wissens-Dialog

- Interaktives Chat-Interface
- Echtzeit-Kommunikation mit AI SDK `streamUI`
- Automatisches Knowledge-Assessment via Tool Calls

### 2. `story-phase.tsx`

**Story-Phase**: Narratives Lernen mit Kapiteln

- Kapitel-basierte Story-Navigation
- Integration mit `ModernVisualization`
- Kapitel-Übersicht für schnelle Navigation
- Key Learnings pro Kapitel

### 3. `quiz-phase.tsx`

**Quiz-Phase**: Adaptives Quiz mit Score-Tracking

- 4-Antwort Multiple-Choice
- Echtzeit-Score-Tracking
- Farbcodierte Schwierigkeitsgrade
- Sofortige Erklärungen nach Antwort

### 4. `modern-visualization.tsx`

**Visualisierungs-Komponente**: Recharts-basierte Charts

- **Timeline**: LineChart für chronologische Daten
- **Comparison**: BarChart für Vergleiche
- **Process**: Horizontaler BarChart für Prozesse
- **Concept-Map**: PieChart für Konzept-Übersichten
- Neobrutalismus-Styling (Retro-Farben, dicke Borders)

### 5. `learning-progress.tsx`

**Fortschritts-Anzeige**: Phase-Navigation

- Desktop: Horizontale Step-Progress
- Mobile: Kompakte Card-Ansicht
- Animierte Übergänge zwischen Phasen

## Workflow

```
Dialog → Story → Quiz → Completed
```

1. **Dialog**: User beantwortet Fragen → KI bewertet Wissen
2. **Story**: User liest Kapitel mit Visualisierungen
3. **Quiz**: User beantwortet Quiz → Score wird gespeichert
4. **Completed**: Abschluss-Screen mit Gesamt-Score

## Integration

Siehe `app/lesson/[id]/page.tsx` für die vollständige Integration aller Phasen.
