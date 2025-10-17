/**
 * Interactive Learning Server Actions - Main Export
 *
 * Diese Datei re-exportiert alle Server Actions aus den spezialisierten Modulen.
 * Imports aus anderen Dateien können weiterhin von "@/app/lesson/[id]/actions" importieren.
 *
 * Struktur:
 * - helper-components.tsx: UI Helper Components für streamUI
 * - database-helpers.ts: Cache-Invalidierung & DB-Updates
 * - actions-dialog-phase.tsx: Dialog Actions (startDialog, continueDialog, forceAssessment)
 * - actions-story-phase.tsx: Story Actions (generateStory)
 * - actions-quiz-phase.tsx: Quiz Actions (generateQuiz)
 * - actions-phase-transitions.ts: Phase-Wechsel Helpers
 */

// Helper Components (für streamUI)
export * from "./helper-components";

// Database & Cache Helpers
export * from "./database-helpers";

// Dialog-Phase Actions
export * from "./actions-dialog-phase";

// Story-Phase Actions
export * from "./actions-story-phase";

// Quiz-Phase Actions
export * from "./actions-quiz-phase";

// Phase Transition Helpers
export * from "./actions-phase-transitions";
