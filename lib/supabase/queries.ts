/**
 * Gecachte Supabase Queries für lernfa.st
 *
 * Verwendet Next.js 15 `unstable_cache` für optimale Performance.
 * Cache-Invalidierung erfolgt über `revalidateTag()` in API-Routes.
 */

import { unstable_cache } from "next/cache";
import { createServiceClient } from "./server";
import type { LessonWithCount, LessonWithFlashcards } from "@/lib/lesson.types";

/**
 * Lädt alle Lessons eines Users mit Flashcard-Count
 *
 * @param userId - Better-Auth User ID
 * @returns Lessons-Liste mit Flashcard-Count
 *
 * Cache: 60 Sekunden
 * Tag: 'lessons' (globale Invalidierung)
 *
 * Note: userId wird automatisch Teil des Cache-Keys durch Funktionsparameter
 */
export const getCachedLessons = unstable_cache(
  async (userId: string) => {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("lesson")
      .select(
        `
        *,
        flashcard(count)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getCachedLessons error:", error);
      return { data: null, error };
    }

    // Transformiere Daten: Extrahiere Flashcard-Count + Interactive Learning Felder
    const lessons: LessonWithCount[] =
      data?.map((lesson: any) => ({
        id: lesson.id,
        user_id: lesson.user_id,
        topic: lesson.topic,
        refined_topic: lesson.refined_topic,
        lesson_type: lesson.lesson_type,
        status: lesson.status,
        current_phase: lesson.current_phase,
        research_data: lesson.research_data,
        dialog_history: lesson.dialog_history,
        created_at: lesson.created_at,
        completed_at: lesson.completed_at,
        flashcard_count: lesson.flashcard?.[0]?.count || 0,
      })) || [];

    return { data: lessons, error: null };
  },
  ["user-lessons"],
  {
    revalidate: 60, // 60 Sekunden Cache
    tags: ["lessons"], // ✅ Statisches Array (Next.js 15 Best Practice)
  }
);

/**
 * Lädt eine einzelne Lesson mit allen Flashcards
 *
 * @param lessonId - Lesson UUID
 * @param userId - Better-Auth User ID (für Ownership-Check)
 * @returns Lesson mit Flashcards
 *
 * Cache: 300 Sekunden (5 Minuten)
 * Tag: 'lessons' (globale Invalidierung)
 *
 * Längerer Cache, da Flashcards nach Erstellung unveränderlich sind.
 * Note: lessonId und userId werden automatisch Teil des Cache-Keys
 */
export const getCachedLesson = unstable_cache(
  async (lessonId: string, userId: string) => {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("lesson")
      .select(
        `
        *,
        flashcard(*)
      `
      )
      .eq("id", lessonId)
      .single();

    if (error) {
      console.error("getCachedLesson error:", error);
      return { data: null, error };
    }

    // Ownership-Check
    if (data && data.user_id !== userId) {
      return {
        data: null,
        error: { message: "Unauthorized", code: "UNAUTHORIZED" } as any,
      };
    }

    return { data: data as unknown as LessonWithFlashcards, error: null };
  },
  ["lesson-details"],
  {
    revalidate: 300, // 5 Minuten Cache
    tags: ["lessons"], // ✅ Statisches Array (Next.js 15 Best Practice)
  }
);

/**
 * Lädt das vollständige User-Profil
 *
 * @param userId - Better-Auth User ID
 * @returns User-Profil-Daten
 *
 * Cache: 120 Sekunden (2 Minuten)
 * Tag: 'users' (globale Invalidierung aller User-Profile)
 *
 * Note: userId wird automatisch Teil des Cache-Keys durch Funktionsparameter
 */
export const getCachedUserProfile = unstable_cache(
  async (userId: string) => {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("user")
      .select(
        `
        id,
        email,
        name,
        image,
        emailVerified,
        age,
        language,
        learning_goals,
        experience_level,
        preferred_difficulty,
        preferred_card_count,
        onboarding_completed,
        profile_updated_at,
        tts_voice,
        avatar_preference,
        dialog_mode,
        createdAt,
        updatedAt
      `
      )
      .eq("id", userId)
      .single();

    if (error) {
      console.error("getCachedUserProfile error:", error);
      return { data: null, error };
    }

    // Transformiere Daten: Konvertiere snake_case zu camelCase
    const transformedData = data
      ? {
          id: data.id,
          email: data.email,
          name: data.name,
          image: data.image,
          emailVerified: data.emailVerified,
          age: data.age,
          language: data.language,
          learningGoals: data.learning_goals,
          experienceLevel: data.experience_level,
          preferredDifficulty: data.preferred_difficulty,
          preferredCardCount: data.preferred_card_count,
          onboardingCompleted: data.onboarding_completed,
          profileUpdatedAt: data.profile_updated_at,
          ttsVoice: data.tts_voice,
          avatarPreference: data.avatar_preference,
          dialogMode: data.dialog_mode,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        }
      : null;

    return { data: transformedData, error: null };
  },
  ["user-profile"],
  {
    revalidate: 120, // 2 Minuten Cache
    tags: ["users"], // ✅ Statisches Array (Next.js 15 Best Practice)
  }
);
