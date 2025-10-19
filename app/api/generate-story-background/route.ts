import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateStory } from "@/app/lesson/[id]/actions/actions-story-phase";

/**
 * POST /api/generate-story-background
 *
 * Background API Route für Story-Generierung während Dialog-Phase
 *
 * WICHTIG: Wird nach der 1. User-Antwort aufgerufen (Fire & Forget)
 * - Lädt lessonType aus DB
 * - Prüft ob Story bereits existiert (Duplikat-Vermeidung)
 * - Startet generateStory() mit korrekter Supabase-Connection
 *
 * Bei Fehler: Silent Failure - Story wird später in StoryGeneratorWrapper nachgeholt
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lessonId, userId, topic } = body;

    if (!lessonId || !userId || !topic) {
      console.error("❌ Missing required fields:", { lessonId, userId, topic });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Lade lessonType aus DB
    const supabase = createServiceClient();
    const { data: lesson, error: lessonError } = await supabase
      .from("lesson")
      .select("lesson_type")
      .eq("id", lessonId)
      .single();

    if (lessonError) {
      console.warn(
        "⚠️ Failed to load lesson_type for background story generation:",
        lessonError.message
      );
      return NextResponse.json(
        { error: "Failed to load lesson" },
        { status: 500 }
      );
    }

    if (!lesson) {
      console.error("❌ Lesson not found:", lessonId);
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // 2. Prüfe ob Story bereits existiert (Duplikat-Vermeidung)
    const { data: existingChapters } = await supabase
      .from("flashcard")
      .select("id")
      .eq("lesson_id", lessonId)
      .eq("phase", "story")
      .limit(1);

    if (existingChapters && existingChapters.length > 0) {
      console.log(
        "✅ Story already exists for lesson:",
        lessonId,
        "- skipping background generation"
      );
      return NextResponse.json({ message: "Story already exists" });
    }

    // 3. Starte Story-Generierung
    console.log("🎬 Starting background story generation for lesson:", lessonId);

    // Nicht awaiten - Fire & Forget (Response sofort zurück)
    generateStory(
      lessonId,
      userId,
      topic,
      "beginner", // Default, wird später durch Dialog-Metadata überschrieben
      lesson.lesson_type as "micro_dose" | "deep_dive"
    )
      .then(() => {
        console.log(
          "✅ Background story generation completed successfully for lesson:",
          lessonId
        );
      })
      .catch((error) => {
        console.error(
          "❌ Background story generation failed for lesson:",
          lessonId
        );
        console.error("   Error:", error);
        console.error(
          "   → Story will be generated on-demand when user reaches story phase (fallback)"
        );
      });

    // Sofort Response (blockiert Dialog nicht)
    return NextResponse.json({ message: "Story generation triggered" });
  } catch (error) {
    console.error("⚠️ Exception in generate-story-background:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
