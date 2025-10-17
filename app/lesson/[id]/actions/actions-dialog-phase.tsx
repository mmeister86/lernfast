"use server";

/**
 * Dialog-Phase Server Actions
 * Interaktiver Wissens-Dialog mit KI-gesteuertem Assessment
 */

import React, { type ReactNode } from "react";
import { streamUI } from "@ai-sdk/rsc";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  DialogMessage,
  AssessmentLoading,
  TransitionToStory,
} from "./helper-components";
import {
  updateDialogScore,
  updatePhase,
  getResearchData,
  saveDialogMetadata,
} from "./database-helpers";
import type { ResearchData } from "@/lib/lesson.types";

// ============================================
// DIALOG-PHASE: Wissensabfrage
// ============================================

/**
 * Startet den Dialog mit einer Initial-Frage vom LLM
 * NEU: Injiziert Research-Daten in den Prompt für kontextbezogene Fragen
 * Wird beim Component-Mount aufgerufen, bevor der User etwas eingeben kann
 */
export async function startDialog(
  lessonId: string,
  topic: string
): Promise<ReactNode> {
  const dialogModel = process.env.OPENAI_SELECTION_MODEL || "gpt-4o-mini";

  // ✅ NEU: Lade Research-Daten für kontextbezogene Fragen
  const researchData = await getResearchData(lessonId);

  // Erstelle Research-Context für den Prompt
  const researchContext = researchData
    ? `
RESEARCH-KONTEXT:
Du hast Zugriff auf folgende Informationen zum Thema:
- Key Facts: ${researchData.facts?.slice(0, 3).join(", ") || "Keine Facts verfügbar"}
- Wichtige Konzepte: ${researchData.concepts?.map((c) => c.name).slice(0, 3).join(", ") || "Keine Konzepte verfügbar"}
- Kernpunkte: ${researchData.keyTakeaways?.slice(0, 2).join(", ") || "Keine Kernpunkte verfügbar"}

Nutze diese Informationen, um eine relevante Einstiegsfrage zu stellen!
`
    : "";

  const result = await streamUI({
    model: openai(dialogModel),
    system: `Du bist ein freundlicher Lern-Coach für das Thema "${topic}".

AUFGABE:
- Stelle EINE prägnante Einstiegsfrage, um das Vorwissen des Nutzers zu ermitteln
- Die Frage sollte offen sein (keine Multiple-Choice)
- Kurz und direkt (1-2 Sätze)
- Motivierend und einladend formuliert
- Beziehe dich auf konkrete Konzepte aus dem Research-Kontext

${researchContext}

BEISPIELE für gute Einstiegsfragen:
- "Was weißt du bereits über [Konzept aus Research]?"
- "Hast du schon einmal mit [Technologie] gearbeitet?"
- "Welche Erfahrungen hast du bisher mit [Spezifisches Konzept] gemacht?"

WICHTIG: Stelle NUR die Frage - keine Einleitung, keine Erklärungen!`,
    prompt: `Stelle eine offene Einstiegsfrage zum Thema "${topic}", die sich auf die Research-Daten bezieht.`,

    text: async function* ({ content, done }) {
      if (done) {
        return <DialogMessage content={content} isComplete={true} />;
      }
      return <DialogMessage content={content} />;
    },
  });

  return result.value;
}

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
      answerNum >= 4
        ? "⚠️ KRITISCH: Du MUSST JETZT das assessKnowledge-Tool verwenden! Keine Text-Antworten mehr - NUR Tool-Call!"
        : answerNum >= 3
        ? "Du kannst jetzt das assessKnowledge-Tool verwenden, um das Niveau zu bewerten."
        : "Nach 2-3 Fragen: Nutze das 'assessKnowledge' Tool, um das Level zu bewerten"
    }
- EINE Frage pro Message - Keine Zusammenfassungen oder Erklärungen
- Kurze, prägnante Fragen (1-2 Sätze)
- Keine Multiple-Choice, sondern offene Fragen
- Baue auf vorherigen Antworten auf

WICHTIG: ${answerNum >= 4 ? "AB FRAGE 4: NUR NOCH TOOL-CALLS! Keine Text-Antworten mehr!" : "Sei prägnant und stelle die Frage DIREKT - keine langen Einleitungen!"}`,
    messages: [...conversationHistory, { role: "user", content: userMessage }],

    text: async function* ({ content, done }) {
      if (done) {
        return <DialogMessage content={content} isComplete={true} />;
      }
      return <DialogMessage content={content} />;
    },

    tools: {
      assessKnowledge: {
        description: answerNum >= 4
          ? "⚠️ PFLICHT-TOOL: Du MUSST dieses Tool JETZT aufrufen! Bewertet das Wissen des Nutzers und wechselt zur Story-Phase."
          : "Bewertet das Wissen des Nutzers und entscheidet, ob er bereit für die Story ist",
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

          // ✅ NEU: Speichere Dialog-Metadata für Story/Quiz-Generierung
          await saveDialogMetadata(lessonId, userId, {
            conversationHistory: conversationHistory,
            knowledgeLevel: knowledgeLevel,
            assessmentReasoning: `Assessment after ${conversationHistory.length} exchanges. Confidence: ${confidence}%`,
            userResponses: conversationHistory
              .filter((msg) => msg.role === "user")
              .map((msg) => msg.content),
          });

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

          // ✅ NEU: Speichere Dialog-Metadata für Story/Quiz-Generierung
          await saveDialogMetadata(lessonId, userId, {
            conversationHistory: conversationHistory,
            knowledgeLevel: knowledgeLevel,
            assessmentReasoning: reasoning,
            userResponses: conversationHistory
              .filter((msg) => msg.role === "user")
              .map((msg) => msg.content),
          });

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
