/**
 * TypeScript Types für Interactive Learning Score System
 * 3-Phasen-Workflow: Dialog → Story → Quiz
 */

/**
 * Lernphasen des interaktiven Workflows
 */
export type LearningPhase = "dialog" | "story" | "quiz" | "completed";

/**
 * Lesson Score Entity
 * Speichert Fortschritt und Performance in allen 3 Phasen
 */
export interface LessonScore {
  id: string;
  lesson_id: string;
  user_id: string;

  // Phase-Scores (0-100)
  dialog_score: number; // Informativ: Geschätztes Vorwissen (nicht in total_score enthalten)
  story_engagement_score: number; // Informativ: Engagement-Metrik (nicht in total_score enthalten)
  quiz_score: number; // Basis für finale Bewertung

  // Gesamtscore (auto-berechnet via Trigger: total_score = quiz_score)
  // Dialog & Story dienen nur der Personalisierung, nicht der Bewertung
  total_score: number;

  // Metadaten
  correct_answers: number;
  total_questions: number;
  time_spent_seconds: number;

  created_at: string;
  updated_at: string;
}

/**
 * Score-Update Payload für API-Calls
 */
export interface ScoreUpdatePayload {
  lessonId: string;
  scoreData: Partial<{
    dialog_score: number;
    story_engagement_score: number;
    quiz_score: number;
    correct_answers: number;
    total_questions: number;
    time_spent_seconds: number;
  }>;
}

/**
 * Quiz-Statistiken für Score-Berechnung
 */
export interface QuizStats {
  correctAnswers: number;
  totalQuestions: number;
  quizScore: number; // Prozent (0-100)
}

/**
 * Dialog-Assessment Result
 * Vom KI Tool "assessKnowledge" zurückgegeben
 */
export interface DialogAssessment {
  knowledgeLevel: "beginner" | "intermediate" | "advanced";
  confidence: number; // 0-100
  readyForStory: boolean;
}

/**
 * Story-Engagement Metriken
 */
export interface StoryEngagement {
  chaptersCompleted: number;
  totalChapters: number;
  timeSpentSeconds: number;
  engagementScore: number; // 0-100, basierend auf Completion + Zeit
}
