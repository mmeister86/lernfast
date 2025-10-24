import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { getCachedUserProfile } from "@/lib/supabase/queries";
import OpenAI from "openai";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { ResearchData } from "@/lib/lesson.types";

/**
 * Helper-Funktion: Light Research für schnellen Dialog-Start
 * Generiert nur die essentiellen Daten für kontextbezogene Dialog-Fragen
 */
async function generateLightResearch(
  topic: string,
  profileContext: any,
  lessonType: "micro_dose" | "deep_dive"
): Promise<ResearchData> {
  const model = process.env.OPENAI_SELECTION_MODEL || "gpt-4o-mini";

  const { object } = await generateObject({
    model: openai(model),
    schema: z.object({
      topic: z.string(),
      facts: z.array(z.string()).length(3), // Nur 3 Facts
      concepts: z
        .array(
          z.object({
            name: z.string(),
            description: z.string(),
            relationships: z.array(z.string()), // Beziehungen zu anderen Konzepten
          })
        )
        .length(3), // Nur 3 Konzepte
      keyTakeaways: z.array(z.string()).length(2), // Nur 2 Takeaways
    }),
    prompt: `Erstelle eine KURZE Recherche zu "${topic}" mit:
- 3 wichtigsten Facts
- 3 Kern-Konzepten
- 2 Key Takeaways

Level: ${profileContext.experienceLevel}
Ziel: Schnelle Basis für Dialog-Fragen (nicht für Story!)

Antworte im JSON-Format.`,
  });

  return {
    topic: object.topic,
    facts: object.facts,
    concepts: object.concepts,
    examples: [], // Wird von Full Research gefüllt
    keyTakeaways: object.keyTakeaways,
  };
}

/**
 * POST /api/trigger-lesson (OPTIMIERTE VERSION - Light Research + Background Full Research)
 *
 * Erstellt eine neue Interactive Learning Lesson mit 3 Phasen:
 * 1. Dialog-Phase (initial - wird live generiert)
 * 2. Story-Phase (3-5 Kapitel mit Visualisierungen)
 * 3. Quiz-Phase (5-7 Fragen mit adaptivem Schwierigkeitsgrad)
 *
 * WICHTIG: Anders als altes System wird Dialog-Content NICHT vorab generiert,
 * sondern live via streamUI in der Lesson Page erstellt.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. AUTH CHECK
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht autorisiert. Bitte melde dich an." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Profildaten für Personalisierung laden
    const { data: userProfile } = await getCachedUserProfile(userId);

    const profileContext = {
      experienceLevel: userProfile?.experienceLevel || "beginner",
      preferredDifficulty: userProfile?.preferredDifficulty || "medium",
      learningGoals: userProfile?.learningGoals || null,
      age: userProfile?.age || null,
      language: userProfile?.language || "de",
      preferredCardCount: userProfile?.preferredCardCount || 5,
    };

    // 2. INPUT VALIDIERUNG
    const body = await request.json();
    const { topic, refinedTopic, lessonType } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json(
        { error: "Bitte gib ein gültiges Thema ein." },
        { status: 400 }
      );
    }

    if (!lessonType || !["micro_dose", "deep_dive"].includes(lessonType)) {
      return NextResponse.json(
        { error: "Ungültiger Lesson-Typ." },
        { status: 400 }
      );
    }

    const targetTopic = refinedTopic || topic.trim();

    // 3. OPENAI API VALIDIERUNG
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key nicht konfiguriert." },
        { status: 500 }
      );
    }

    // 4. DATENBANK: Erstelle Lesson-Eintrag (ohne Research)
    const supabase = createServiceClient();

    const { data: lesson, error: dbError } = await supabase
      .from("lesson")
      .insert({
        user_id: userId,
        topic: topic.trim(),
        refined_topic: refinedTopic || null,
        lesson_type: lessonType,
        status: "processing", // ← WICHTIG: Nicht "completed" - wird nach Light Research gesetzt
        current_phase: "dialog", // Startet mit Dialog-Phase
      })
      .select()
      .single();

    if (dbError || !lesson) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Fehler beim Erstellen der Lerneinheit." },
        { status: 500 }
      );
    }

    // 5. LIGHT RESEARCH: Schnelle Basis für Dialog-Fragen (2-3s statt 15s)
    try {
      console.log(
        `⚡ Starting LIGHT research for topic: "${targetTopic}" (${lessonType})`
      );

      const lightResearch = await generateLightResearch(
        targetTopic,
        profileContext,
        lessonType
      );

      console.log("📊 Light Research Data:", {
        factsCount: lightResearch.facts?.length || 0,
        conceptsCount: lightResearch.concepts?.length || 0,
        keyTakeawaysCount: lightResearch.keyTakeaways?.length || 0,
      });

      // Speichere Light Research in DB
      await supabase
        .from("lesson")
        .update({
          research_data: lightResearch,
          status: "completed", // Jetzt bereit für Dialog-Phase
          completed_at: new Date().toISOString(),
        })
        .eq("id", lesson.id);

      console.log(
        `✅ Light research completed for lesson: ${lesson.id} - Dialog kann starten!`
      );

      // ============================================
      // STEP 3: FULL RESEARCH IM BACKGROUND (Fire & Forget)
      // ============================================
      // Läuft parallel während User im Dialog ist
      // Überschreibt Light Research mit vollständigen Daten
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";
        fetch(`${baseUrl}/api/generate-full-research`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: lesson.id,
            topic: targetTopic,
            lessonType,
            profileContext,
          }),
        }).catch((err) => {
          console.warn("⚠️ Full research background trigger failed:", err);
          // Silent failure - Story wird später mit Light Research Fallback generiert
        });

        console.log(
          "🚀 Full research background trigger sent for lesson:",
          lesson.id
        );
      } catch (error) {
        console.error(
          "⚠️ Exception while triggering background full research:",
          error
        );
        // Weitermachen - Story wird später mit Light Research Fallback generiert
      }
    } catch (error) {
      console.error("Light research generation error:", error);

      // Status auf 'failed' setzen
      await supabase
        .from("lesson")
        .update({ status: "failed" })
        .eq("id", lesson.id);

      return NextResponse.json(
        {
          error:
            "Fehler bei der Light Research-Generierung. Bitte versuche es erneut.",
          details:
            process.env.NODE_ENV === "development"
              ? error instanceof Error
                ? error.message
                : String(error)
              : undefined,
        },
        { status: 500 }
      );
    }

    // 6. CACHE INVALIDIERUNG
    revalidateTag("lessons");
    revalidatePath("/dashboard");

    // 6. ERFOLGREICHE RESPONSE
    return NextResponse.json(
      {
        success: true,
        lessonId: lesson.id,
        status: "completed",
        message:
          "Deine Lerneinheit ist bereit! Dialog startet sofort - Story wird im Hintergrund vorbereitet.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected error in trigger-lesson:", error);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}
