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

    // 5. KI-GENERIERUNG: Story + Quiz Content vorab erstellen
    // (Dialog wird live generiert in der Lesson Page)
    try {
      await supabase
        .from("lesson")
        .update({ status: "processing" })
        .eq("id", lesson.id);

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // ============================================
      // STAGE 1: RESEARCH - Fakten & Konzepte sammeln
      // ============================================

      const researchModel =
        lessonType === "micro_dose"
          ? process.env.OPENAI_MICRO_DOSE_MODEL || "gpt-4.1-mini"
          : process.env.OPENAI_DEEP_DIVE_MODEL || "o4-mini-deep-research";

      const chapterCount = lessonType === "micro_dose" ? 3 : 5;
      const questionCount = lessonType === "micro_dose" ? 5 : 7;

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

      // ============================================
      // STAGE 2: STORY GENERATION
      // ============================================

      const structureModel =
        process.env.OPENAI_STRUCTURE_MODEL || "gpt-4.1-mini";

      const storySystemPrompt = `Du bist ein Storytelling-Experte, der Lerngeschichten mit interaktiven Visualisierungen erstellt.

**AUFGABE:**
Erstelle eine ${chapterCount}-teilige Lerngeschichte basierend auf den Research-Daten.

**STORY-STRUKTUR:**
- Jedes Kapitel = narrative Szene (200-300 Wörter)
- Nutze Metaphern, konkrete Beispiele und visuelle Beschreibungen
- Baue auf vorherigen Kapiteln auf
- 2-3 Key Learnings pro Kapitel

**VISUALISIERUNGEN:**
Wähle für jedes Kapitel eine passende Visualisierung:
- **timeline**: LineChart für chronologische Entwicklungen
- **comparison**: BarChart für Vergleiche zwischen Konzepten
- **process**: Horizontaler BarChart für Prozess-Schritte
- **concept-map**: PieChart für Konzept-Verteilungen

**OUTPUT-FORMAT (JSON):**
{
  "chapters": [
    {
      "chapterNumber": 1,
      "chapterTitle": "Titel",
      "narrative": "Story-Text (200-300 Wörter)",
      "keyLearnings": ["Learning 1", "Learning 2"],
      "visualizationType": "timeline",
      "visualizationData": {
        "title": "Chart-Titel",
        "chartData": [
          { "name": "Label1", "value": 100 },
          { "name": "Label2", "value": 150 }
        ]
      }
    }
  ]
}

**WICHTIGE REGELN:**
- Genau ${chapterCount} Kapitel
- Narrative: 200-300 Wörter (fließender Text, keine Bullet Points)
- Key Learnings: 2-3 pro Kapitel
- ChartData MUSS gültige Recharts-Daten sein (Array mit {name, value} Objekten)
- Deutsche Sprache`;

      const storyCompletion = await openai.chat.completions.create({
        model: structureModel,
        messages: [
          { role: "system", content: storySystemPrompt },
          {
            role: "user",
            content: `Basierend auf diesen Research-Daten, erstelle eine ${chapterCount}-teilige Lerngeschichte:

**RESEARCH:**
${JSON.stringify(researchData, null, 2)}

**USER-PROFIL:**
- Level: ${profileContext.experienceLevel}
- Schwierigkeit: ${profileContext.preferredDifficulty}
${profileContext.age ? `- Alter: ${profileContext.age}` : ""}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const storyData = JSON.parse(
        storyCompletion.choices[0].message.content || "{}"
      );

      console.log(
        `✅ Story completed: ${storyData.chapters?.length || 0} chapters (${structureModel})`
      );

      // Speichere Story-Kapitel in DB
      if (storyData.chapters && Array.isArray(storyData.chapters)) {
        const storyInserts = storyData.chapters.map((chapter: any) => ({
          lesson_id: lesson.id,
          question: chapter.chapterTitle, // Legacy-Feld
          phase: "story",
          order_index: (chapter.chapterNumber || 1) - 1,
          learning_content: {
            story: {
              chapterTitle: chapter.chapterTitle,
              narrative: chapter.narrative,
              keyPoints: chapter.keyLearnings || [],
              visualizations: [
                {
                  type: chapter.visualizationType,
                  title: chapter.visualizationData?.title || "",
                  chartData: chapter.visualizationData?.chartData || [],
                },
              ],
            },
          },
        }));

        const { error: storyError } = await supabase
          .from("flashcard")
          .insert(storyInserts);

        if (storyError) {
          throw new Error(`Story Insert Error: ${storyError.message}`);
        }
      }

      // ============================================
      // STAGE 3: QUIZ GENERATION
      // ============================================

      const quizSystemPrompt = `Du bist ein Quiz-Ersteller für interaktive Lerninhalte.

**AUFGABE:**
Erstelle ${questionCount} Quiz-Fragen basierend auf Story und Research.

**QUIZ-STRUKTUR:**
- Mix aus Schwierigkeitsgraden: 30% easy, 50% medium, 20% hard
- 4 Antwortoptionen pro Frage (nur eine richtig)
- Detaillierte Erklärung zur richtigen Antwort (50-100 Wörter)

**OUTPUT-FORMAT (JSON):**
{
  "questions": [
    {
      "questionNumber": 1,
      "question": "Frage-Text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "difficulty": "medium",
      "explanation": "Erklärung (50-100 Wörter)"
    }
  ]
}

**WICHTIGE REGELN:**
- Genau ${questionCount} Fragen
- correctAnswer = Index (0-3)
- Difficulty-Verteilung: ${Math.ceil(questionCount * 0.3)} easy, ${Math.ceil(questionCount * 0.5)} medium, ${Math.floor(questionCount * 0.2)} hard
- Deutsche Sprache
- Erklärungen sind lehrreich und detailliert`;

      const quizCompletion = await openai.chat.completions.create({
        model: structureModel,
        messages: [
          { role: "system", content: quizSystemPrompt },
          {
            role: "user",
            content: `Basierend auf Research und Story, erstelle ${questionCount} Quiz-Fragen:

**RESEARCH:**
${JSON.stringify(researchData, null, 2)}

**STORY:**
${JSON.stringify(storyData.chapters?.map((c: any) => ({ title: c.chapterTitle, keyLearnings: c.keyLearnings })) || [], null, 2)}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const quizData = JSON.parse(
        quizCompletion.choices[0].message.content || "{}"
      );

      console.log(
        `✅ Quiz completed: ${quizData.questions?.length || 0} questions (${structureModel})`
      );

      // Speichere Quiz-Fragen in DB
      if (quizData.questions && Array.isArray(quizData.questions)) {
        const quizInserts = quizData.questions.map((q: any) => ({
          lesson_id: lesson.id,
          question: q.question, // Legacy-Feld
          phase: "quiz",
          order_index: (q.questionNumber || 1) - 1,
          learning_content: {
            quiz: {
              question: q.question,
              options: q.options || [],
              correctAnswer: q.correctAnswer || 0,
              difficulty: q.difficulty || "medium",
              explanation: q.explanation || "",
            },
          },
        }));

        const { error: quizError } = await supabase
          .from("flashcard")
          .insert(quizInserts);

        if (quizError) {
          throw new Error(`Quiz Insert Error: ${quizError.message}`);
        }
      }

      // Status auf 'completed' setzen
      await supabase
        .from("lesson")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", lesson.id);

      console.log(`✅ Interactive Learning Lesson created: ${lesson.id}`);
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

