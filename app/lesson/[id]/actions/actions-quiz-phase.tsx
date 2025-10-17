"use server";

/**
 * Quiz-Phase Server Actions
 * Adaptives Quiz mit Score-Tracking und Erklärungen
 */

import React, { type ReactNode } from "react";
import { streamUI } from "@ai-sdk/rsc";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { QuestionLoading, AdaptingDifficulty } from "./helper-components";
import { updatePhase } from "./database-helpers";

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
