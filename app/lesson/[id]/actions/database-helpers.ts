"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ResearchData } from "@/lib/lesson.types";
import type { LessonScoreMetadata, ConversationEntry } from "@/lib/score.types";

// ============================================
// CACHE INVALIDIERUNG
// ============================================

/**
 * Invalidiert Cache für eine bestimmte Lesson
 * MUSS außerhalb von Render-Funktionen aufgerufen werden (Next.js 15 Requirement)
 *
 * @param lessonId - Die ID der Lesson, deren Cache invalidiert werden soll
 */
export async function invalidateLessonCache(lessonId: string) {
  "use server";

  revalidateTag("lessons"); // Invalidiert Dashboard-Liste
  revalidatePath("/dashboard"); // Invalidiert Dashboard-Page
  revalidatePath(`/lesson/${lessonId}`); // Invalidiert Lesson-Page
  revalidatePath("/", "layout"); // NEU: Globaler Layout-Cache für Mobile-Browser
}

// ============================================
// DATABASE HELPER FUNCTIONS
// ============================================

export async function updateDialogScore(
  lessonId: string,
  userId: string,
  confidence: number
) {
  const supabase = createServiceClient();

  await supabase.from("lesson_score").upsert(
    {
      lesson_id: lessonId,
      user_id: userId,
      dialog_score: Math.round(confidence),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "lesson_id,user_id" }
  );

  // Cache-Invalidierung erfolgt später via invalidateLessonCache()
}

export async function updatePhase(lessonId: string, phase: string) {
  const supabase = createServiceClient();

  // Schritt 1: Update DB mit Fehlerbehandlung
  const { error } = await supabase
    .from("lesson")
    .update({ current_phase: phase })
    .eq("id", lessonId);

  if (error) {
    console.error("❌ Failed to update phase:", error);
    throw new Error(`Phase update failed: ${error.message}`);
  }

  // Schritt 2: Read-after-Write Verifizierung (wichtig für Race Condition!)
  // Garantiert dass Phase wirklich in DB geschrieben wurde, bevor Caller weiter macht
  const { data: verifyData } = await supabase
    .from("lesson")
    .select("current_phase")
    .eq("id", lessonId)
    .single();

  if (verifyData?.current_phase !== phase) {
    console.warn("⚠️ Phase write verification failed, retrying...");
    // Retry einmal mit kurzem Delay
    await supabase
      .from("lesson")
      .update({ current_phase: phase })
      .eq("id", lessonId);
    await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms warten
  }

  console.log(`✅ Phase updated successfully to: ${phase}`);
  // WICHTIG: KEIN redirect() hier! Caller entscheidet über Navigation-Timing
}

export async function updateQuizScore(
  lessonId: string,
  userId: string,
  scoreData: {
    correctAnswers: number;
    totalQuestions: number;
    quizScore: number;
  }
) {
  const supabase = createServiceClient();

  await supabase.from("lesson_score").upsert(
    {
      lesson_id: lessonId,
      user_id: userId,
      quiz_score: scoreData.quizScore,
      correct_answers: scoreData.correctAnswers,
      total_questions: scoreData.totalQuestions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "lesson_id,user_id" }
  );

  // Cache-Invalidierung erfolgt später via invalidateLessonCache()
}

// ============================================
// NEU: RESEARCH DATA & METADATA HELPERS
// ============================================

/**
 * Lädt Research-Daten für eine Lesson
 * Wird in Dialog/Story/Quiz verwendet für Context-Injection
 *
 * Best Practice: Nutzt Supabase Error-Pattern (keine try/catch)
 */
export async function getResearchData(
  lessonId: string
): Promise<ResearchData | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("lesson")
    .select("research_data")
    .eq("id", lessonId)
    .single();

  if (error) {
    console.error("Failed to load research_data:", error.message);
    return null;
  }

  if (!data?.research_data) {
    console.warn("No research_data found for lesson:", lessonId);
    return null;
  }

  return data.research_data as ResearchData;
}

/**
 * Speichert Dialog-Conversation-History + Assessment-Ergebnisse
 * Wird nach Dialog-Assessment aufgerufen
 *
 * Best Practice: Upsert für idempotente Updates
 *
 * @returns {Promise<boolean>} true wenn erfolgreich, false bei Fehler (nicht critical)
 *
 * WICHTIG: Wirft KEINEN Error - Metadata ist optional!
 * Bei Failure wird nur geloggt, damit UI nicht hängen bleibt.
 */
export async function saveDialogMetadata(
  lessonId: string,
  userId: string,
  metadata: {
    conversationHistory: ConversationEntry[];
    knowledgeLevel: "beginner" | "intermediate" | "advanced";
    assessmentReasoning?: string;
    userResponses?: string[];
  }
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase.from("lesson_score").upsert(
      {
        lesson_id: lessonId,
        user_id: userId,
        metadata: metadata as LessonScoreMetadata,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lesson_id,user_id" }
    );

    if (error) {
      console.error("⚠️ Failed to save dialog metadata:", error.message);
      console.error("   Lesson ID:", lessonId);
      console.error("   User ID:", userId);
      console.error("   Error Details:", error);
      return false;
    }

    console.log("✅ Dialog metadata saved:", {
      lessonId,
      knowledgeLevel: metadata.knowledgeLevel,
      conversationLength: metadata.conversationHistory.length,
    });
    return true;
  } catch (error) {
    // Network errors, fetch failed, etc.
    console.error("⚠️ Exception while saving dialog metadata:", error);
    console.error("   Lesson ID:", lessonId);
    console.error("   User ID:", userId);
    // Metadata ist optional - kein Hard-Fail!
    return false;
  }
}

/**
 * Lädt Metadata (Dialog-History + Assessment) für Story/Quiz-Generierung
 *
 * Best Practice: Graceful Fallback wenn keine Metadata vorhanden
 */
export async function getDialogMetadata(
  lessonId: string,
  userId: string
): Promise<LessonScoreMetadata | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("lesson_score")
    .select("metadata")
    .eq("lesson_id", lessonId)
    .eq("user_id", userId)
    .single();

  if (error) {
    // Kein Fehler loggen wenn einfach noch keine Metadata vorhanden
    // (z.B. bei Lessons die direkt zu Story springen)
    if (error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Failed to load dialog metadata:", error.message);
    }
    return null;
  }

  if (!data?.metadata) {
    console.warn("No dialog metadata found for lesson:", lessonId);
    return null;
  }

  return data.metadata as LessonScoreMetadata;
}

// ============================================
// NEU: DIALOG-PERSISTIERUNG HELPERS
// ============================================

/**
 * Speichert Dialog-Message in Datenbank (Persistierung)
 * Wird nach JEDER User/Assistant Message aufgerufen
 */
export async function saveDialogMessage(
  lessonId: string,
  role: "user" | "assistant",
  content: string
) {
  const supabase = createServiceClient();

  // Lade aktuelle History
  const { data: lesson } = await supabase
    .from("lesson")
    .select("dialog_history")
    .eq("id", lessonId)
    .single();

  const currentHistory = (lesson?.dialog_history as any[]) || [];

  // Füge neue Message hinzu
  const newHistory = [
    ...currentHistory,
    {
      role,
      content,
      timestamp: new Date().toISOString(),
    },
  ];

  // Speichere aktualisierte History
  await supabase
    .from("lesson")
    .update({ dialog_history: newHistory })
    .eq("id", lessonId);

  console.log(`✅ Dialog message saved (${role}):`, content.substring(0, 50));
}

/**
 * Lädt Dialog-History aus Datenbank
 * Wird beim Component-Mount aufgerufen für Wiederaufnahme
 */
export async function loadDialogHistory(
  lessonId: string
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("lesson")
    .select("dialog_history")
    .eq("id", lessonId)
    .single();

  if (error || !data?.dialog_history) {
    console.log("No dialog history found for lesson:", lessonId);
    return [];
  }

  console.log(
    `✅ Dialog history loaded: ${
      (data.dialog_history as any[]).length
    } messages`
  );
  return data.dialog_history as Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

/**
 * Löscht Dialog-History (z.B. nach Abschluss oder Reset)
 */
export async function clearDialogHistory(lessonId: string) {
  const supabase = createServiceClient();

  await supabase
    .from("lesson")
    .update({ dialog_history: [] })
    .eq("id", lessonId);

  console.log("✅ Dialog history cleared for lesson:", lessonId);
}
