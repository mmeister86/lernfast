"use server";

/**
 * Server Actions für Interactive Learning mit Vercel AI SDK v5
 * Implementiert 3-Phasen-Workflow: Dialog → Story → Quiz
 */

import React, { type ReactNode } from "react";
import { streamUI } from "@ai-sdk/rsc";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidateTag, revalidatePath } from "next/cache";
import type { StoryChapter, QuizQuestion } from "@/lib/lesson.types";
import type { DialogAssessment } from "@/lib/score.types";

// ============================================
// HELPER COMPONENTS FÜR STREAMING UI
// ============================================

function DialogMessage({
  content,
  isComplete,
}: {
  content: string;
  isComplete?: boolean;
}) {
  return (
    <div className="mb-4">
      <div
        className={`p-4 rounded-[15px] border-4 border-black ${
          isComplete ? "bg-[#FFC667]" : "bg-white"
        }`}
      >
        <p className="text-lg font-medium text-black">{content}</p>
      </div>
    </div>
  );
}

function AssessmentLoading() {
  return (
    <div className="p-4 bg-[#FB7DA8] border-4 border-black rounded-[15px]">
      <p className="text-lg font-extrabold text-black">
        🧠 Analysiere dein Wissen...
      </p>
    </div>
  );
}

function TransitionToStory({ knowledgeLevel }: { knowledgeLevel: string }) {
  return (
    <div className="p-6 bg-gradient-to-br from-[#00D9BE] to-[#0CBCD7] border-4 border-black rounded-[15px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <p className="text-2xl font-extrabold text-black mb-2">
        ✅ Dialog abgeschlossen!
      </p>
      <p className="text-lg font-medium text-black">
        Dein Level: <strong>{knowledgeLevel}</strong>. Lass uns in die Story
        eintauchen!
      </p>
    </div>
  );
}

function ChapterLoading({ title }: { title: string }) {
  return (
    <div className="p-6 bg-white border-4 border-black rounded-[15px]">
      <p className="text-xl font-extrabold mb-2">📖 {title}</p>
      <p className="text-lg font-medium text-gray-600">Erstelle Kapitel...</p>
    </div>
  );
}

function QuestionLoading() {
  return (
    <div className="p-4 bg-[#662CB7] text-white border-4 border-black rounded-[15px]">
      <p className="text-lg font-extrabold">🎯 Generiere Frage...</p>
    </div>
  );
}

function AdaptingDifficulty() {
  return (
    <div className="p-4 bg-[#FFC667] border-4 border-black rounded-[15px]">
      <p className="text-lg font-extrabold">
        ⚙️ Passe Schwierigkeitsgrad an...
      </p>
    </div>
  );
}

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
}

// ============================================
// DATABASE HELPER FUNCTIONS
// ============================================

async function updateDialogScore(
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

async function updatePhase(lessonId: string, phase: string) {
  const supabase = createServiceClient();

  await supabase
    .from("lesson")
    .update({ current_phase: phase })
    .eq("id", lessonId);

  // Cache-Invalidierung erfolgt später via invalidateLessonCache()
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
// DIALOG-PHASE: Wissensabfrage
// ============================================

export async function continueDialog(
  lessonId: string,
  userId: string,
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  topic: string,
  currentAnswerCount?: number,
  maxAnswers?: number
): Promise<ReactNode> {
  const dialogModel = process.env.OPENAI_SELECTION_MODEL || "gpt-4o-mini";
  const answerNum = currentAnswerCount || 1;
  const maxAns = maxAnswers || 5;

  const result = await streamUI({
    model: openai(dialogModel),
    system: `Du bist ein freundlicher Lern-Coach für das Thema "${topic}".

AUFGABE:
- Stelle gezielte Fragen, um das Vorwissen des Nutzers zu ermitteln
- Passe deine Fragen dynamisch an die Antworten an
- Sei motivierend und unterstützend

STRIKTE REGEL - MAXIMAL 5 FRAGEN:
- Der Nutzer hat bisher ${answerNum} von ${maxAns} Fragen beantwortet
- ${
      answerNum === maxAns - 1
        ? "DIES IST DIE LETZTE FRAGE! Stelle eine abschließende Frage."
        : `Du kannst noch ${maxAns - answerNum} Frage(n) stellen.`
    }
- ${
      answerNum >= 3
        ? "Du kannst jetzt bei der nächsten Frage die assessKnowledge-Tool verwenden, um das Niveau zu bewerten."
        : "Nach 2-3 Fragen: Nutze das 'assessKnowledge' Tool, um das Level zu bewerten"
    }
- EINE Frage pro Message - Keine Zusammenfassungen oder Erklärungen
- Kurze, prägnante Fragen (1-2 Sätze)
- Keine Multiple-Choice, sondern offene Fragen
- Baue auf vorherigen Antworten auf

WICHTIG: Sei prägnant und stelle die Frage DIREKT - keine langen Einleitungen!`,
    messages: [...conversationHistory, { role: "user", content: userMessage }],

    text: async function* ({ content, done }) {
      if (done) {
        return <DialogMessage content={content} isComplete={true} />;
      }
      return <DialogMessage content={content} />;
    },

    tools: {
      assessKnowledge: {
        description:
          "Bewertet das Wissen des Nutzers und entscheidet, ob er bereit für die Story ist",
        inputSchema: z.object({
          knowledgeLevel: z.enum(["beginner", "intermediate", "advanced"]),
          confidence: z
            .number()
            .min(0)
            .max(100)
            .describe("Konfidenz-Score (0-100)"),
          readyForStory: z
            .boolean()
            .describe("Ist der Nutzer bereit für die Story-Phase?"),
        }),
        generate: async function* ({
          knowledgeLevel,
          confidence,
          readyForStory,
        }) {
          yield <AssessmentLoading />;

          // Speichere Dialog-Score in DB
          await updateDialogScore(lessonId, userId, confidence);

          if (readyForStory) {
            // Update Phase zu 'story'
            await updatePhase(lessonId, "story");
            return <TransitionToStory knowledgeLevel={knowledgeLevel} />;
          }

          return (
            <div className="p-4 bg-[#FFC667] border-4 border-black rounded-[15px]">
              <p className="text-lg font-medium">
                Dein aktuelles Level: <strong>{knowledgeLevel}</strong> (
                {confidence}% Konfidenz). Lass uns noch ein wenig tiefer gehen!
              </p>
            </div>
          );
        },
      },
    },
  });

  return result.value;
}

// ============================================
// FORCE ASSESSMENT: Automatisches Ende nach 5 Fragen
// ============================================

export async function forceAssessment(
  lessonId: string,
  userId: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  topic: string
): Promise<ReactNode> {
  const assessmentModel = process.env.OPENAI_SELECTION_MODEL || "gpt-4o-mini";

  // Erstelle einen zusammengefassten Prompt basierend auf der Conversation-History
  const conversationSummary = conversationHistory
    .map(
      (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
    )
    .join("\n\n");

  const result = await streamUI({
    model: openai(assessmentModel),
    system: `Du bist ein Bildungs-Assessor, der das Wissen eines Nutzers bewertet.

AUFGABE:
Analysiere das folgende Gespräch und bewerte das Vorwissen des Nutzers.

WICHTIG:
- Der Nutzer hat maximal 5 Fragen beantwortet
- Du MUSST JETZT das Wissen bewerten und die readyForStory Flag auf true setzen
- Keine weiteren Fragen stellen!
- Nutze das assessKnowledge-Tool mit den Ergebnissen`,
    prompt: `Basierend auf diesem Gespräch zum Thema "${topic}", bewerte das Wissen des Nutzers:

${conversationSummary}

Nutze das assessKnowledge-Tool, um die Bewertung zu speichern und zur Story-Phase zu wechseln.`,

    text: async function* ({ content }) {
      return (
        <div className="p-4 bg-white border-4 border-black rounded-[15px]">
          <p className="text-lg font-medium">{content}</p>
        </div>
      );
    },

    tools: {
      assessKnowledge: {
        description:
          "Bewertet das Wissen basierend auf der Conversation und wechselt zur Story-Phase",
        inputSchema: z.object({
          knowledgeLevel: z.enum(["beginner", "intermediate", "advanced"]),
          confidence: z
            .number()
            .min(0)
            .max(100)
            .describe("Konfidenz-Score (0-100)"),
          reasoning: z.string().describe("Kurze Begründung der Bewertung"),
        }),
        generate: async function* ({ knowledgeLevel, confidence, reasoning }) {
          yield <AssessmentLoading />;

          // Speichere Dialog-Score in DB
          await updateDialogScore(lessonId, userId, confidence);

          // Wechsle automatisch zur Story-Phase
          await updatePhase(lessonId, "story");

          return (
            <div className="p-6 bg-gradient-to-br from-[#00D9BE] to-[#0CBCD7] border-4 border-black rounded-[15px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-2xl font-extrabold text-black mb-3">
                ✅ Bewertung abgeschlossen!
              </p>
              <div className="space-y-2 text-lg font-medium text-black mb-4">
                <p>
                  <strong>Dein Level:</strong> {knowledgeLevel}
                </p>
                <p>
                  <strong>Konfidenz:</strong> {confidence}%
                </p>
              </div>
              <div className="bg-white/30 border-2 border-black rounded-[15px] p-3 mb-3">
                <p className="text-base font-medium text-black">
                  <strong>Analyse:</strong> {reasoning}
                </p>
              </div>
              <p className="text-lg font-extrabold text-black">
                🚀 Los geht's mit deiner Lerngeschichte!
              </p>
            </div>
          );
        },
      },
    },
  });

  return result.value;
}

// ============================================
// STORY-PHASE: Narrative Lernerfahrung
// ============================================

export async function generateStory(
  lessonId: string,
  userId: string,
  topic: string,
  knowledgeLevel: string,
  lessonType: "micro_dose" | "deep_dive"
): Promise<ReactNode> {
  const storyModel =
    lessonType === "micro_dose"
      ? process.env.OPENAI_MICRO_DOSE_MODEL || "gpt-4.1-mini"
      : process.env.OPENAI_DEEP_DIVE_MODEL || "o4-mini-deep-research";

  const chapterCount = lessonType === "micro_dose" ? 3 : 5;

  const result = await streamUI({
    model: openai(storyModel),
    system: `Du bist ein Storytelling-Experte, der komplexe Themen in fesselnde Geschichten verwandelt.

AUFGABE:
Erstelle eine Lerngeschichte zum Thema "${topic}" mit ${chapterCount} Kapiteln.
User-Level: ${knowledgeLevel}

STORY-STRUKTUR:
- Jedes Kapitel = eine narrative Szene (150-250 Wörter)
- Nutze Metaphern, konkrete Beispiele und visuelle Beschreibungen
- Baue auf vorherigen Kapiteln auf
- Ende mit einem "Aha!"-Moment

VISUALISIERUNGEN (KRITISCH):
Du MUSST für jedes Kapitel eine passende Visualisierung mit ECHTEN DATEN erstellen:

1. **timeline**: Für chronologische Entwicklungen (z.B. historischer Verlauf)
   - chartData: [{ name: "Zeitpunkt", value: Zahl }, ...]
   - Beispiel: [{ name: "1990", value: 10 }, { name: "2000", value: 25 }, { name: "2010", value: 40 }]

2. **comparison**: Für Vergleiche zwischen Optionen/Konzepten
   - chartData: [{ name: "Option", value: Wert }, ...]
   - Beispiel: [{ name: "React", value: 85 }, { name: "Vue", value: 70 }, { name: "Angular", value: 60 }]

3. **process**: Für Schritt-für-Schritt Abläufe
   - chartData: [{ name: "Schritt", value: Fortschritt% }, ...]
   - Beispiel: [{ name: "Planning", value: 100 }, { name: "Design", value: 80 }, { name: "Build", value: 50 }]

4. **concept-map**: Für Anteile/Verteilungen von Konzepten
   - chartData: [{ name: "Teil", value: Prozent }, ...]
   - Beispiel: [{ name: "Frontend", value: 40 }, { name: "Backend", value: 35 }, { name: "DevOps", value: 25 }]

WICHTIGE REGELN:
- IMMER 3-8 Datenpunkte pro Visualisierung
- Werte müssen zum Kapitel-Inhalt passen (keine zufälligen Zahlen!)
- Jeder Datenpunkt braucht 'name' (String) und 'value' (Number)
- Titel der Visualisierung sollte beschreibend sein
- Passe Komplexität an Level an (beginner = einfache Sprache, advanced = Fachbegriffe)`,
    prompt: `Erstelle eine ${chapterCount}-teilige Lerngeschichte zu "${topic}". Nutze das createChapter-Tool für jedes Kapitel.`,

    text: async function* ({ content }) {
      return (
        <div className="p-4 bg-white border-4 border-black rounded-[15px]">
          <p className="text-lg font-medium">{content}</p>
        </div>
      );
    },

    tools: {
      createChapter: {
        description: "Erstellt ein Story-Kapitel mit Visualisierung",
        inputSchema: z.object({
          chapterNumber: z.number().min(1).max(10),
          chapterTitle: z
            .string()
            .describe("Titel des Kapitels (kurz und prägnant)"),
          narrative: z
            .string()
            .min(150)
            .max(300)
            .describe("Die Story-Szene (150-250 Wörter)"),
          keyLearnings: z
            .array(z.string())
            .min(2)
            .max(3)
            .describe("2-3 wichtige Lernpunkte"),
          visualizationType: z
            .enum(["timeline", "comparison", "process", "concept-map"])
            .describe(
              "Wähle den passenden Visualisierungstyp basierend auf dem Kapitel-Inhalt"
            ),
          visualizationData: z.object({
            title: z
              .string()
              .describe(
                "Beschreibender Titel für die Visualisierung (z.B. 'Entwicklung über Zeit', 'Vergleich der Optionen')"
              ),
            chartData: z
              .array(
                z.object({
                  name: z
                    .string()
                    .describe(
                      "Label für Datenpunkt (z.B. 'Tag 1', 'React', 'Schritt 1')"
                    ),
                  value: z
                    .number()
                    .describe(
                      "Numerischer Wert für Datenpunkt (muss zum Thema passen!)"
                    ),
                })
              )
              .min(3)
              .max(8)
              .describe(
                "Mindestens 3-8 Datenpunkte mit {name: string, value: number} Struktur"
              ),
          }),
        }),
        generate: async function* ({
          chapterNumber,
          chapterTitle,
          narrative,
          keyLearnings,
          visualizationType,
          visualizationData,
        }) {
          yield <ChapterLoading title={chapterTitle} />;

          // Debug-Logging
          console.log("📊 createChapter called:", {
            chapterNumber,
            chapterTitle,
            visualizationType,
            hasChartData: !!visualizationData.chartData,
            chartDataLength: visualizationData.chartData?.length || 0,
            chartData: visualizationData.chartData,
          });

          // TEMPORÄRER FALLBACK: Füge Test-Daten hinzu falls LLM leeres Array liefert
          let finalChartData = visualizationData.chartData;
          if (!finalChartData || finalChartData.length === 0) {
            console.warn(
              "⚠️ LLM returned empty chartData, using fallback test data"
            );

            // Generiere passende Test-Daten basierend auf visualizationType
            switch (visualizationType) {
              case "timeline":
                finalChartData = [
                  { name: "Start", value: 20 },
                  { name: "Mitte", value: 50 },
                  { name: "Ende", value: 80 },
                ];
                break;
              case "comparison":
                finalChartData = [
                  { name: "Option A", value: 75 },
                  { name: "Option B", value: 60 },
                  { name: "Option C", value: 85 },
                ];
                break;
              case "process":
                finalChartData = [
                  { name: "Schritt 1", value: 100 },
                  { name: "Schritt 2", value: 75 },
                  { name: "Schritt 3", value: 50 },
                ];
                break;
              case "concept-map":
                finalChartData = [
                  { name: "Konzept A", value: 40 },
                  { name: "Konzept B", value: 35 },
                  { name: "Konzept C", value: 25 },
                ];
                break;
            }
          }

          // Speichere Kapitel in Datenbank (flashcard mit phase='story')
          const supabase = createServiceClient();
          await supabase.from("flashcard").insert({
            lesson_id: lessonId,
            question: chapterTitle, // Legacy-Feld
            phase: "story",
            order_index: chapterNumber - 1,
            learning_content: {
              story: {
                chapterTitle,
                narrative,
                keyPoints: keyLearnings,
                visualizations: [
                  {
                    type: visualizationType,
                    title: visualizationData.title,
                    chartData: finalChartData, // ✅ Verwende finalChartData statt original
                  },
                ],
              },
            },
          });

          console.log(
            "✅ Saved chapter with chartData length:",
            finalChartData.length
          );

          return (
            <div className="mb-6 space-y-4">
              <div className="bg-gradient-to-br from-[#FFC667] to-[#FB7DA8] border-4 border-black rounded-[15px] p-6">
                <h3 className="text-2xl font-extrabold text-black mb-2">
                  📖 Kapitel {chapterNumber}: {chapterTitle}
                </h3>
                <p className="text-lg font-medium text-black leading-relaxed whitespace-pre-wrap">
                  {narrative}
                </p>
              </div>

              <div className="bg-[#00D9BE] border-4 border-black rounded-[15px] p-4">
                <h4 className="text-xl font-extrabold mb-2">
                  💡 Das Wichtigste:
                </h4>
                <ul className="space-y-1">
                  {keyLearnings.map((learning, i) => (
                    <li
                      key={i}
                      className="text-lg font-medium flex items-start gap-2"
                    >
                      <span className="text-xl">✓</span>
                      <span>{learning}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border-4 border-black rounded-[15px] p-4">
                <p className="text-sm font-medium text-gray-600">
                  Visualisierung: {visualizationType} - "
                  {visualizationData.title}"
                </p>
              </div>
            </div>
          );
        },
      },
    },
  });

  // Nach allen Kapiteln: Update Phase zu 'quiz'
  await updatePhase(lessonId, "quiz");

  return result.value;
}

// ============================================
// QUIZ-PHASE: Adaptive Wissensabfrage
// ============================================

export async function generateQuiz(
  lessonId: string,
  userId: string,
  storyContent: string,
  knowledgeLevel: string
): Promise<ReactNode> {
  const quizModel = process.env.OPENAI_STRUCTURE_MODEL || "gpt-4.1-mini";

  const result = await streamUI({
    model: openai(quizModel),
    system: `Du bist ein Quiz-Ersteller, der adaptives Assessment durchführt.

AUFGABE:
Erstelle 5-7 Quiz-Fragen basierend auf der Story.
User-Level: ${knowledgeLevel}

QUIZ-STRUKTUR:
- Jede Frage hat 4 Antwortoptionen (nur eine richtig)
- Mix aus Schwierigkeitsgraden (30% easy, 50% medium, 20% hard)
- Nach jeder Frage eine Erklärung (1-2 Sätze)
- Nutze "createQuestion" Tool für jede Frage

ADAPTIVE SCHWIERIGKEIT:
- Bei 3 richtigen Antworten in Folge → nutze "adaptDifficulty" Tool
- Bei 3 falschen Antworten in Folge → nutze "adaptDifficulty" Tool`,
    prompt: `Erstelle ein Quiz basierend auf diesem Lerninhalt:\n\n${storyContent}\n\nNutze das createQuestion-Tool für jede Frage.`,

    text: async function* ({ content }) {
      return (
        <div className="p-4 bg-white border-4 border-black rounded-[15px]">
          <p className="text-lg font-medium">{content}</p>
        </div>
      );
    },

    tools: {
      createQuestion: {
        description: "Erstellt eine Quiz-Frage mit 4 Antworten",
        inputSchema: z.object({
          questionNumber: z.number().min(1),
          question: z.string().min(10).describe("Die Quiz-Frage"),
          options: z.array(z.string()).length(4).describe("4 Antwortoptionen"),
          correctAnswer: z
            .number()
            .min(0)
            .max(3)
            .describe("Index der richtigen Antwort (0-3)"),
          difficulty: z.enum(["easy", "medium", "hard"]),
          explanation: z
            .string()
            .min(20)
            .describe("Erklärung zur richtigen Antwort"),
        }),
        generate: async function* ({
          questionNumber,
          question,
          options,
          correctAnswer,
          difficulty,
          explanation,
        }) {
          yield <QuestionLoading />;

          // Speichere Frage in Datenbank
          const supabase = createServiceClient();
          await supabase.from("flashcard").insert({
            lesson_id: lessonId,
            question: question, // Legacy-Feld
            phase: "quiz",
            order_index: questionNumber - 1,
            learning_content: {
              quiz: {
                question,
                options,
                correctAnswer,
                difficulty,
                explanation,
              },
            },
          });

          return (
            <div className="mb-4 p-6 bg-white border-4 border-black rounded-[15px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-extrabold">
                  Frage {questionNumber}
                </h3>
                <span
                  className={`px-3 py-1 text-sm font-extrabold border-2 border-black rounded-[10px] ${
                    difficulty === "easy"
                      ? "bg-[#00D9BE]"
                      : difficulty === "medium"
                      ? "bg-[#FFC667]"
                      : "bg-[#FC5A46] text-white"
                  }`}
                >
                  {difficulty.toUpperCase()}
                </span>
              </div>
              <p className="text-lg font-medium mb-4">{question}</p>
              <div className="space-y-2">
                {options.map((option, i) => (
                  <div
                    key={i}
                    className={`p-3 border-2 border-black rounded-[10px] ${
                      i === correctAnswer ? "bg-[#00D9BE]" : "bg-gray-50"
                    }`}
                  >
                    <span className="font-extrabold">
                      {["A", "B", "C", "D"][i]})
                    </span>{" "}
                    {option}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-[#FFC667] border-2 border-black rounded-[10px]">
                <p className="text-sm font-medium">
                  <strong>Erklärung:</strong> {explanation}
                </p>
              </div>
            </div>
          );
        },
      },

      adaptDifficulty: {
        description:
          "Passt Schwierigkeitsgrad basierend auf User-Performance an",
        inputSchema: z.object({
          currentScore: z
            .number()
            .min(0)
            .max(100)
            .describe("Aktueller Score in %"),
          correctStreak: z
            .number()
            .describe("Anzahl aufeinanderfolgender richtiger Antworten"),
          newDifficulty: z.enum(["easy", "medium", "hard"]),
          encouragement: z.string().describe("Motivierende Nachricht"),
        }),
        generate: async function* ({
          currentScore,
          newDifficulty,
          encouragement,
        }) {
          yield <AdaptingDifficulty />;

          return (
            <div className="mb-4 p-6 bg-gradient-to-br from-[#662CB7] to-[#FB7DA8] text-white border-4 border-black rounded-[15px]">
              <p className="text-xl font-extrabold mb-2">
                📊 Schwierigkeit angepasst!
              </p>
              <p className="text-lg font-medium mb-2">
                Dein aktueller Score: {currentScore}% - Neuer Level:{" "}
                <strong>{newDifficulty.toUpperCase()}</strong>
              </p>
              <p className="text-lg font-medium">{encouragement}</p>
            </div>
          );
        },
      },
    },
  });

  // Nach Quiz: Update Phase zu 'completed'
  await updatePhase(lessonId, "completed");

  return result.value;
}

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
