/**
 * TypeScript Types für Lesson & Flashcard Entities
 * Basierend auf Supabase PostgreSQL Schema
 */

export type LessonStatus = "pending" | "processing" | "completed" | "failed";
export type LessonType = "micro_dose" | "deep_dive";

/**
 * Lesson Entity (Lerneinheit)
 * Eine Lesson enthält mehrere Flashcards
 */
export interface Lesson {
  id: string;
  user_id: string;
  topic: string;
  lesson_type: LessonType;
  status: LessonStatus;
  created_at: string; // ISO 8601 timestamp string von Supabase
  completed_at: string | null;
}

/**
 * Visualisierungstypen für Flashcards
 */
export type VisualizationType = "thesys" | "mermaid";

/**
 * Mermaid Diagramm-Typen
 */
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

/**
 * Mermaid Visualisierung mit Code und optional gecachtem SVG
 */
export interface MermaidVisualization {
  diagramType: MermaidDiagramType;
  code: string; // Mermaid syntax code
  svg?: string; // Serverseitig generiertes SVG (optional cached)
}

/**
 * Generische Visualisierung - kann entweder Thesys oder Mermaid sein
 */
export interface Visualization {
  type: VisualizationType;
  data: ThesysJSON | MermaidVisualization;
}

/**
 * Flashcard Entity (Einzelne Lernkarte)
 * Gehört zu einer Lesson
 *
 * MIGRATION NOTE: Alte Flashcards haben `thesys_json`, neue haben `visualizations`
 * Beide Felder werden während der Übergangsphase unterstützt
 */
export interface Flashcard {
  id: string;
  lesson_id: string;
  question: string;
  thesys_json?: ThesysJSON | null; // Legacy field - wird bald entfernt
  visualizations?: Visualization[]; // Neues Feld - Array von Visualisierungen
  is_learned: boolean;
  created_at: string; // ISO 8601 timestamp string von Supabase
}

/**
 * Thesys/C1 JSON-Format für visuelle Graphen/Mindmaps
 * Wird in flashcard.thesys_json als JSONB gespeichert
 */
export interface ThesysJSON {
  nodes: ThesysNode[];
  edges: ThesysEdge[];
  layout: "hierarchical" | "force-directed";
}

/**
 * Node in einem Thesys-Graph
 * Repräsentiert Konzepte, Details, Beispiele oder Definitionen
 */
export interface ThesysNode {
  id: string;
  label: string;
  type: "concept" | "detail" | "example" | "definition";
}

/**
 * Edge (Verbindung) zwischen zwei Nodes in einem Thesys-Graph
 * Zeigt logische Beziehungen zwischen Konzepten
 */
export interface ThesysEdge {
  from: string;
  to: string;
  label: string;
}

/**
 * Lesson mit Flashcard-Anzahl (für Dashboard)
 */
export interface LessonWithCount extends Lesson {
  flashcard_count: number;
}

/**
 * Lesson mit allen zugehörigen Flashcards (für Viewer)
 */
export interface LessonWithFlashcards extends Lesson {
  flashcard: Flashcard[];
}
