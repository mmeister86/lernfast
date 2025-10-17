import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { getCachedUserProfile } from "@/lib/supabase/queries";
import OpenAI from "openai";

/**
 * POST /api/trigger-lesson (NEUE VERSION - Interactive Learning)
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

    // 4. DATENBANK: Erstelle Lesson-Eintrag
    const supabase = createServiceClient();

    const { data: lesson, error: dbError } = await supabase
      .from("lesson")
      .insert({
        user_id: userId,
        topic: topic.trim(),
        refined_topic: refinedTopic || null,
        lesson_type: lessonType,
        status: "pending",
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

    // 5. KI-GENERIERUNG: NUR Research-Phase (Story + Quiz werden LIVE generiert)
    // Dialog wird live generiert in der Lesson Page via streamUI
    // Story wird nach Dialog generiert (mit Dialog-Context)
    // Quiz wird nach Story generiert (mit Story + Dialog-Context)
    try {
      await supabase
        .from("lesson")
        .update({ status: "processing" })
        .eq("id", lesson.id);

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // ============================================
      // STAGE 1: RESEARCH - Fakten & Konzepte sammeln
      // ============================================
      // Diese Daten werden in lesson.research_data gespeichert
      // und später für Dialog, Story und Quiz verwendet

      const researchModel =
        lessonType === "micro_dose"
          ? process.env.OPENAI_MICRO_DOSE_MODEL || "gpt-4.1-mini"
          : process.env.OPENAI_DEEP_DIVE_MODEL || "o4-mini-deep-research";

      // Für spätere Live-Generierung (in actions-story-phase.tsx und actions-quiz-phase.tsx)
      const chapterCount = lessonType === "micro_dose" ? 3 : 5;
      const questionCount = lessonType === "micro_dose" ? 5 : 7;

      console.log(
        `🔬 Starting Research Phase for topic: "${targetTopic}" (${lessonType})`
      );
      console.log(
        `📚 Lesson will have ${chapterCount} chapters and ${questionCount} quiz questions (generated LIVE after dialog)`
      );

      const researchSystemPrompt = `Du bist ein Recherche-Experte für interaktive Lerngeschichten.

AUFGABE:
Recherchiere umfassend zum Thema und sammle Material für:
1. Eine fesselnde ${chapterCount}-teilige Lerngeschichte
2. Ein ${questionCount}-Fragen Quiz zur Wissensabfrage

**PERSONALISIERUNG:**
- Erfahrungslevel: ${profileContext.experienceLevel}
- Schwierigkeitsgrad: ${profileContext.preferredDifficulty}
${profileContext.age ? `- Alter: ${profileContext.age} Jahre` : ""}
${profileContext.learningGoals ? `- Lernziele: ${profileContext.learningGoals}` : ""}

**OUTPUT-FORMAT (JSON):**
{
  "topic": "Thema",
  "facts": ["Fakt 1", "Fakt 2", ...],
  "concepts": [
    {
      "name": "Konzept-Name",
      "description": "Erklärung",
      "relationships": ["Beziehung zu anderen Konzepten"]
    }
  ],
  "examples": ["Beispiel 1", "Beispiel 2", ...],
  "keyTakeaways": ["Hauptpunkt 1", "Hauptpunkt 2", ...]
}`;

      const researchCompletion = await openai.chat.completions.create({
        model: researchModel,
        messages: [
          { role: "system", content: researchSystemPrompt },
          {
            role: "user",
            content: `Recherchiere umfassend zum Thema: ${targetTopic}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const researchData = JSON.parse(
        researchCompletion.choices[0].message.content || "{}"
      );

      console.log(
        `✅ Research completed for topic: ${targetTopic} (${researchModel})`
      );
      console.log("📊 Research Data:", {
        factsCount: researchData.facts?.length || 0,
        conceptsCount: researchData.concepts?.length || 0,
        examplesCount: researchData.examples?.length || 0,
        keyTakeawaysCount: researchData.keyTakeaways?.length || 0,
      });

      // ============================================
      // SPEICHERE RESEARCH-DATEN IN DB
      // ============================================
      // Story + Quiz werden SPÄTER generiert (nach Dialog-Phase)

      await supabase
        .from("lesson")
        .update({
          research_data: researchData, // Speichere für spätere Verwendung
          status: "completed", // Lesson ist bereit für Dialog-Phase
          completed_at: new Date().toISOString(),
        })
        .eq("id", lesson.id);

      console.log(
        `✅ Lesson created successfully: ${lesson.id} (Research-Only Mode)`
      );

      // ============================================
      // ENTFERNT: STAGE 2 & 3 (Story + Quiz)
      // ============================================
      // Diese Stages werden LIVE generiert:
      // - Story: Nach Dialog-Phase in actions-story-phase.tsx
      // - Quiz: Nach Story-Phase in actions-quiz-phase.tsx
      //
      // Vorteil: Maximal personalisiert basierend auf Dialog-Erkenntnissen
    } catch (error) {
      console.error("Content generation error:", error);

      // Status auf 'failed' setzen
      await supabase
        .from("lesson")
        .update({ status: "failed" })
        .eq("id", lesson.id);

      return NextResponse.json(
        {
          error: "Fehler bei der KI-Generierung. Bitte versuche es erneut.",
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

    // 7. ERFOLGREICHE RESPONSE
    return NextResponse.json(
      {
        success: true,
        lessonId: lesson.id,
        status: "completed",
        message:
          "Deine interaktive Lerneinheit wurde erfolgreich erstellt! Starte jetzt mit dem Dialog.",
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

