/**
 * TypeScript Types für Lesson & Flashcard Entities
 * Basierend auf Supabase PostgreSQL Schema
 */

export type LessonStatus = "pending" | "processing" | "completed" | "failed";
export type LessonType = "micro_dose" | "deep_dive";
export type LearningPhase = "dialog" | "story" | "quiz" | "completed";

/**
 * Topic Suggestion für Multi-Stage Workflow
 * Wird von /api/suggest-topics generiert
 */
export interface TopicSuggestion {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

/**
 * Research Data - Gespeichert in lesson.research_data
 * Wird von Stage 1 generiert und für Dialog/Story/Quiz verwendet
 */
export interface ResearchData {
  topic: string;
  facts: string[]; // Array von Fakten zum Thema
  concepts: ResearchConcept[]; // Strukturierte Konzepte mit Beziehungen
  examples: string[]; // Konkrete Beispiele
  keyTakeaways: string[]; // Hauptpunkte zum Mitnehmen
}

/**
 * Research Concept - Teil von ResearchData
 */
export interface ResearchConcept {
  name: string;
  description: string;
  relationships: string[]; // Beziehungen zu anderen Konzepten
}

/**
 * Lesson Entity (Lerneinheit)
 * Eine Lesson enthält mehrere Flashcards
 */
export interface Lesson {
  id: string;
  user_id: string;
  topic: string;
  refined_topic?: string | null; // NEU: User-selected refined topic from suggestions
  lesson_type: LessonType;
  status: LessonStatus;
  current_phase?: LearningPhase; // NEU: Aktuelle Phase im interaktiven Workflow
  research_data?: ResearchData; // NEU: Research-Daten aus Stage 1
  created_at: string; // ISO 8601 timestamp string von Supabase
  completed_at: string | null;
}

/**
 * Visualisierungstypen für Flashcards
 */
export type VisualizationType = "thesys" | "d3";

/**
 * D3 Layout-Typen für Graph-Visualisierungen
 */
export type D3LayoutType =
  | "force-directed" // Für Concept Maps mit freier Anordnung
  | "hierarchical" // Für Tree-Strukturen (Top-Down)
  | "radial" // Für zentrale Konzepte mit radialen Verbindungen
  | "cluster"; // Für gruppierte Themen

/**
 * D3 Node für Graph-Visualisierung
 */
export interface D3Node {
  id: string;
  label: string;
  type: "concept" | "detail" | "example" | "definition";
  color?: string; // Optional: Custom color override
}

/**
 * D3 Link (Verbindung) zwischen zwei Nodes
 */
export interface D3Link {
  source: string; // Node ID
  target: string; // Node ID
  label?: string; // Optional edge label
  strength?: number; // Optional: 0-1 für Force-Simulation
}

/**
 * D3 Visualisierung mit Nodes, Links und Layout-Konfiguration
 */
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

/**
 * Generische Visualisierung - kann entweder Thesys oder D3 sein
 */
export interface Visualization {
  type: VisualizationType;
  data: ThesysJSON | D3Visualization;
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
  answer?: string | null; // NEU: Explanatory text content (150-300 words)
  thesys_json?: ThesysJSON | null; // Legacy field - wird bald entfernt
  visualizations?: Visualization[]; // Neues Feld - Array von Visualisierungen
  learning_content?: LearningContent; // NEU: Interactive Learning Content
  phase?: "dialog" | "story" | "quiz"; // NEU: Zu welcher Phase gehört diese Karte
  order_index?: number; // NEU: Reihenfolge innerhalb der Phase
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

// ============================================
// INTERACTIVE LEARNING TYPES (NEU)
// ============================================

/**
 * Learning Content - Phasenspezifischer Inhalt
 */
export interface LearningContent {
  dialog?: DialogContent;
  story?: StoryContent;
  quiz?: QuizContent;
}

/**
 * Dialog-Phase Content
 */
export interface DialogContent {
  question: string;
  expectedAnswer?: string;
  hints?: string[];
  followUpQuestions?: string[];
}

/**
 * Story-Phase Content
 */
export interface StoryContent {
  chapterTitle: string;
  narrative: string;
  keyPoints: string[];
  visualizations: StoryVisualization[];
  audioUrl?: string; // ✅ NEU: Vorab-generiertes Audio (Base64-URL)
}

/**
 * Moderne Visualisierungen für Story-Phase (Recharts-kompatibel)
 */
export interface StoryVisualization {
  type: "timeline" | "comparison" | "process" | "concept-map";
  title: string;
  chartData: any[]; // Recharts-kompatible Datenstruktur
}

/**
 * Quiz-Phase Content
 */
export interface QuizContent {
  question: string;
  options: string[]; // Array mit 4 Antworten
  correctAnswer: number; // Index (0-3)
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
}

/**
 * Story Chapter für Story-Phase UI
 */
export interface StoryChapter {
  title: string;
  narrative: string;
  keyLearnings: string[];
  visualizationType: "timeline" | "comparison" | "process" | "concept-map";
  visualizationData: {
    title: string;
    chartData: any[];
  };
  audioUrl?: string; // ✅ NEU: Vorab-generiertes Audio (optional)
}

/**
 * Quiz Question für Quiz-Phase UI
 */
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
}
