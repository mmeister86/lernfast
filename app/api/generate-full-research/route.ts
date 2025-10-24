import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import OpenAI from "openai";

/**
 * POST /api/generate-full-research
 *
 * Background-Route für vollständige Research-Generierung während Dialog
 * Überschreibt Light Research mit vollständigen Daten
 *
 * WICHTIG: Fire & Forget - läuft parallel während User im Dialog ist
 * Falls fehlschlägt: Story nutzt Light Research Fallback
 */
export async function POST(request: NextRequest) {
  try {
    const { lessonId, topic, lessonType, profileContext } =
      await request.json();

    if (!lessonId || !topic) {
      console.error("❌ Missing required fields:", { lessonId, topic });
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const researchModel =
      lessonType === "micro_dose"
        ? process.env.OPENAI_MICRO_DOSE_MODEL || "gpt-4o-mini"
        : process.env.OPENAI_DEEP_DIVE_MODEL || "o1-mini";

    console.log(
      `🔬 Starting FULL research for lesson: ${lessonId} (${researchModel})`
    );

    // Für spätere Live-Generierung (in actions-story-phase.tsx und actions-quiz-phase.tsx)
    const chapterCount = lessonType === "micro_dose" ? 3 : 5;
    const questionCount = lessonType === "micro_dose" ? 5 : 7;

    const researchSystemPrompt = `Du bist ein Recherche-Experte für interaktive Lerngeschichten.

AUFGABE:
Recherchiere umfassend zum Thema und sammle Material für:
1. Eine fesselnde ${chapterCount}-teilige Lerngeschichte
2. Ein ${questionCount}-Fragen Quiz zur Wissensabfrage

**PERSONALISIERUNG:**
- Erfahrungslevel: ${profileContext?.experienceLevel || "beginner"}
- Schwierigkeitsgrad: ${profileContext?.preferredDifficulty || "medium"}
${profileContext?.age ? `- Alter: ${profileContext.age} Jahre` : ""}
${
  profileContext?.learningGoals
    ? `- Lernziele: ${profileContext.learningGoals}`
    : ""
}

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

    // Vollständige Research (wie bisher in trigger-lesson)
    const completion = await openai.chat.completions.create({
      model: researchModel,
      messages: [
        { role: "system", content: researchSystemPrompt },
        {
          role: "user",
          content: `Recherchiere umfassend zum Thema: ${topic}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const fullResearchData = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    console.log(
      `✅ FULL research completed for lesson: ${lessonId} (${researchModel})`
    );
    console.log("📊 Full Research Data:", {
      factsCount: fullResearchData.facts?.length || 0,
      conceptsCount: fullResearchData.concepts?.length || 0,
      examplesCount: fullResearchData.examples?.length || 0,
      keyTakeawaysCount: fullResearchData.keyTakeaways?.length || 0,
    });

    // Update Lesson mit vollständigen Research-Daten
    const supabase = createServiceClient();
    const { error: updateError } = await supabase
      .from("lesson")
      .update({ research_data: fullResearchData })
      .eq("id", lessonId);

    if (updateError) {
      console.error(
        "❌ Failed to update lesson with full research:",
        updateError
      );
      return NextResponse.json(
        { error: "Failed to save full research data" },
        { status: 500 }
      );
    }

    console.log(`✅ Lesson ${lessonId} updated with FULL research data`);

    return NextResponse.json({
      success: true,
      message: "Full research completed and saved",
    });
  } catch (error) {
    console.error("⚠️ Full research failed for lesson:", error);
    return NextResponse.json(
      {
        error: "Research failed - story will use light research fallback",
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
}
