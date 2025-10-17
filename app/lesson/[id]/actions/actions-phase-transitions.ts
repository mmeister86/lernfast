"use server";

/**
 * Phase Transition Helpers
 * Utility-Funktionen für Phase-Wechsel zwischen Dialog → Story → Quiz → Completed
 */

import { createServiceClient } from "@/lib/supabase/server";
import { updatePhase } from "./database-helpers";

// ============================================
// PHASE-TRANSITION HELPERS
// ============================================

export async function transitionToStoryPhase(lessonId: string) {
  await updatePhase(lessonId, "story");
  return { success: true };
}

export async function transitionToQuizPhase(lessonId: string) {
  await updatePhase(lessonId, "quiz");
  return { success: true };
}

export async function completeLesson(lessonId: string) {
  await updatePhase(lessonId, "completed");

  const supabase = createServiceClient();
  await supabase
    .from("lesson")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", lessonId);

  // Cache-Invalidierung erfolgt später via invalidateLessonCache()
  return { success: true };
}
