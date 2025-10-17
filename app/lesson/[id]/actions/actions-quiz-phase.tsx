"use server";

/**
 * Quiz-Phase Server Actions
 * Adaptives Quiz mit Score-Tracking und Erklärungen
 */

import React, { type ReactNode } from "react";
import { generateObject } from "ai";
import { streamUI } from "@ai-sdk/rsc";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import {
  updatePhase,
  getResearchData,
  getDialogMetadata,
  invalidateLessonCache,
} from "./database-helpers";

// Loading Components für streamUI
function QuestionLoading() {
  return (
    <div className="animate-pulse p-6 bg-gray-100 border-4 border-black rounded-[15px]">
      <div className="h-6 bg-gray-300 rounded w-1/2 mb-4"></div>
      <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-300 rounded w-full"></div>
    </div>
  );
}

function AdaptingDifficulty() {
  return (
    <div className="animate-pulse p-6 bg-purple-100 border-4 border-black rounded-[15px]">
      <div className="h-6 bg-purple-300 rounded w-2/3"></div>
    </div>
  );
}

// ============================================
// QUIZ-PHASE: Adaptive Wissensabfrage
// ============================================

/**
 * Generiert Quiz-Fragen basierend auf Story-Kapiteln und Research-Daten
 * Wird vom "Weiter zum Quiz"-Button in der Story-Phase aufgerufen
 */
export async function generateQuizFromStory(
  lessonId: string,
  userId: string,
  topic: string,
  lessonType: "micro_dose" | "deep_dive"
): Promise<void> {
  const quizModel = process.env.OPENAI_STRUCTURE_MODEL || "gpt-4.1-mini";
  const questionCount = lessonType === "micro_dose" ? 5 : 7;

  console.log(`🎯 Starting Quiz Generation for lesson: ${lessonId}`);

  // 1. Lade Research-Daten
  const researchData = await getResearchData(lessonId);
  const dialogMetadata = await getDialogMetadata(lessonId, userId);

  // 2. Lade Story-Kapitel aus DB
  const supabase = createServiceClient();
  const { data: storyChapters } = await supabase
    .from("flashcard")
    .select("*")
    .eq("lesson_id", lessonId)
    .eq("phase", "story")
    .order("order_index");

  if (!storyChapters || storyChapters.length === 0) {
    throw new Error("Keine Story-Kapitel gefunden - Quiz kann nicht erstellt werden");
  }

  // 3. Erstelle Story-Context für Quiz-Generierung
  const storyContext = storyChapters
    .map(
      (chapter, i) =>
        `Kapitel ${i + 1}: ${chapter.question}\n${chapter.learning_content?.story?.narrative || ""}`
    )
    .join("\n\n");

  const researchContext = researchData
    ? `
FORSCHUNGS-DATEN:
- Facts: ${researchData.facts?.join(", ") || "Keine verfügbar"}
- Konzepte: ${researchData.concepts?.map((c) => c.name).join(", ") || "Keine verfügbar"}
- Beispiele: ${researchData.examples?.join(", ") || "Keine verfügbar"}
`
    : "";

  const dialogContext = dialogMetadata
    ? `
USER-PROFIL:
- Knowledge Level: ${dialogMetadata.knowledgeLevel}
- Schwachstellen: ${dialogMetadata.storyPreferences?.weakPoints?.join(", ") || "Nicht bekannt"}
`
    : "";

  // 4. Quiz-Schema definieren
  const questionSchema = z.object({
    question: z.string().min(10).describe("Die Quiz-Frage (klar und präzise)"),
    options: z
      .array(z.string())
      .length(4)
      .describe("4 Antwortoptionen (nur eine richtig)"),
    correctAnswer: z
      .number()
      .min(0)
      .max(3)
      .describe("Index der richtigen Antwort (0-3)"),
    difficulty: z.enum(["easy", "medium", "hard"]),
    explanation: z
      .string()
      .min(20)
      .max(200)
      .describe("Erklärung zur richtigen Antwort (1-2 Sätze)"),
  });

  const quizSchema = z.object({
    questions: z.array(questionSchema).length(questionCount),
  });

  // 5. Generiere Quiz mit OpenAI
  const { object: quiz } = await generateObject({
    model: openai(quizModel),
    schema: quizSchema,
    system: `Du bist ein Quiz-Ersteller für das Thema "${topic}".

AUFGABE:
Erstelle EXAKT ${questionCount} Quiz-Fragen basierend auf der Story und den Research-Daten.

${researchContext}
${dialogContext}

QUIZ-REGELN:
- Mix aus Schwierigkeitsgraden: 30% easy, 50% medium, 20% hard
- Fragen sollten das Verständnis prüfen, nicht nur Faktenwissen
- Alle 4 Optionen müssen plausibel sein (keine offensichtlich falschen Antworten)
- Erklärungen sollten das "Warum" verdeutlichen
- Passe Schwierigkeit an User-Level an: ${dialogMetadata?.knowledgeLevel || "intermediate"}
- Fokussiere auf Schwachstellen: ${dialogMetadata?.storyPreferences?.weakPoints?.join(", ") || "Allgemein"}

STORY-KONTEXT (nutze diese Inhalte für Fragen):
${storyContext}`,
    prompt: `Erstelle ein Quiz mit ${questionCount} Fragen zu "${topic}". Gib das Ergebnis als JSON-Objekt zurück.`,
  });

  console.log(`✅ Quiz object generated with ${quiz.questions.length} questions.`);

  // 6. Speichere Quiz-Fragen in DB
  const questionsToInsert = quiz.questions.map((q, index) => ({
    lesson_id: lessonId,
    question: q.question,
    phase: "quiz",
    order_index: index,
    learning_content: {
      quiz: {
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty,
        explanation: q.explanation,
      },
    },
  }));

  const { error: insertError } = await supabase
    .from("flashcard")
    .insert(questionsToInsert);

  if (insertError) {
    console.error("❌ Failed to save quiz questions:", insertError);
    throw new Error("Fehler beim Speichern der Quiz-Fragen.");
  }

  console.log(`✅ All ${quiz.questions.length} questions saved to database`);

  // 7. Invalidiere Cache und update Phase zu 'quiz'
  await invalidateLessonCache(lessonId);
  await updatePhase(lessonId, "quiz");

  console.log("✅ Quiz generation complete - phase updated to 'quiz'");
}

export async function generateQuiz(
  lessonId: string,
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

    text: async function* ({ content }: { content: string }) {
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
        }: {
          questionNumber: number;
          question: string;
          options: string[];
          correctAnswer: number;
          difficulty: "easy" | "medium" | "hard";
          explanation: string;
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
                {options.map((option: string, i: number) => (
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
        }: {
          currentScore: number;
          correctStreak: number;
          newDifficulty: "easy" | "medium" | "hard";
          encouragement: string;
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
