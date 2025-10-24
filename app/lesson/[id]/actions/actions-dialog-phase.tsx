"use server";

/**
 * Dialog-Phase Server Actions
 * Interaktiver Wissens-Dialog mit KI-gesteuertem Assessment
 */

import React, { type ReactNode } from "react";
import { streamUI } from "@ai-sdk/rsc";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
  invalidateLessonCache,
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

  // ✅ NEU: Lade User-Profil für Personalisierung
  const session = await auth.api.getSession({ headers: await headers() });
  const userProfile = session?.user;

  // Extrahiere Profil-Daten (mit Fallbacks)
  const userAge = userProfile?.age;
  const userLanguage = userProfile?.language || "de";
  const userExperience = userProfile?.experienceLevel || "beginner";

  // ✅ NEU: Lade Research-Daten für kontextbezogene Fragen
  const researchData = await getResearchData(lessonId);

  // Erstelle Research-Context für den Prompt
  const researchContext = researchData
    ? `
RESEARCH-KONTEXT:
Du hast Zugriff auf folgende Informationen zum Thema:
- Key Facts: ${
        researchData.facts?.slice(0, 3).join(", ") || "Keine Facts verfügbar"
      }
- Wichtige Konzepte: ${
        researchData.concepts
          ?.map((c) => c.name)
          .slice(0, 3)
          .join(", ") || "Keine Konzepte verfügbar"
      }
- Kernpunkte: ${
        researchData.keyTakeaways?.slice(0, 2).join(", ") ||
        "Keine Kernpunkte verfügbar"
      }

Nutze diese Informationen, um eine relevante Einstiegsfrage zu stellen!
`
    : "";

  // ✅ NEU: Personalisierter Context
  const personalizedContext = `
USER-PROFIL (Personalisierung):
${userAge ? `- Alter: ${userAge} Jahre` : "- Alter: Nicht angegeben"}
${
  userExperience
    ? `- Erfahrungslevel: ${userExperience} (passe Komplexität der Fragen an!)`
    : ""
}
${
  userLanguage !== "de"
    ? `- Bevorzugte Sprache: ${userLanguage} (aber Dialog ist auf Deutsch)`
    : ""
}

WICHTIG: Passe deine Fragen an Alter und Erfahrungslevel an!
${userAge && userAge < 14 ? "- Nutze einfache, kindgerechte Sprache" : ""}
${
  userAge && userAge >= 18
    ? "- Nutze anspruchsvolle, professionelle Sprache"
    : ""
}
${
  userExperience === "beginner"
    ? "- Stelle grundlegende Fragen, erkläre Konzepte einfach"
    : ""
}
${
  userExperience === "advanced"
    ? "- Stelle tiefergehende Fragen, nutze Fachbegriffe"
    : ""
}
`;

  const result = await streamUI({
    model: openai(dialogModel),
    system: `Du bist ein freundlicher Lern-Coach für das Thema "${topic}".

${personalizedContext}

AUFGABE:
- Stelle EINE prägnante Einstiegsfrage, um das Vorwissen des Nutzers zu ermitteln
- Die Frage sollte offen sein (keine Multiple-Choice)
- Kurz und direkt (1-2 Sätze)
- Motivierend und einladend formuliert
- Beziehe dich auf konkrete Konzepte aus dem Research-Kontext
- Duze den Nutzer IMMER (verwende "du", "dein", "dir")
- Passe die Komplexität an Alter und Erfahrungslevel an

${researchContext}

BEISPIELE für gute Einstiegsfragen:
- "Was weißt du bereits über [Konzept aus Research]?"
- "Hast du schon einmal mit [Technologie] gearbeitet?"
- "Welche Erfahrungen hast du bisher mit [Spezifisches Konzept] gemacht?"

WICHTIG: Stelle NUR die Frage - keine Einleitung, keine Erklärungen!
WICHTIG: IMMER "Du" verwenden, niemals "Sie"!`,
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

  // ✅ NEU: Lade User-Profil für Personalisierung
  const session = await auth.api.getSession({ headers: await headers() });
  const userProfile = session?.user;

  // Extrahiere Profil-Daten (mit Fallbacks)
  const userAge = userProfile?.age;
  const userLanguage = userProfile?.language || "de";
  const userExperience = userProfile?.experienceLevel || "beginner";

  // ✅ NEU: Personalisierter Context
  const personalizedContext = `
USER-PROFIL (Personalisierung):
${userAge ? `- Alter: ${userAge} Jahre` : "- Alter: Nicht angegeben"}
${
  userExperience
    ? `- Erfahrungslevel: ${userExperience} (passe Komplexität der Fragen an!)`
    : ""
}
${
  userLanguage !== "de"
    ? `- Bevorzugte Sprache: ${userLanguage} (aber Dialog ist auf Deutsch)`
    : ""
}

WICHTIG: Passe deine Fragen an Alter und Erfahrungslevel an!
${userAge && userAge < 14 ? "- Nutze einfache, kindgerechte Sprache" : ""}
${
  userAge && userAge >= 18
    ? "- Nutze anspruchsvolle, professionelle Sprache"
    : ""
}
${
  userExperience === "beginner"
    ? "- Stelle grundlegende Fragen, erkläre Konzepte einfach"
    : ""
}
${
  userExperience === "advanced"
    ? "- Stelle tiefergehende Fragen, nutze Fachbegriffe"
    : ""
}
`;

  // ✅ NEU: Trigger Background Story-Generierung nach 1. User-Antwort
  // Story wird während des Dialogs generiert und ist bei Dialog-Ende (nach ~30-60s) fertig
  if (answerNum === 1) {
    try {
      // Fire & Forget via fetch (verhindert Supabase Connection Issues)
      // Verwende fetch statt direkten Server Action Call wegen besserer Isolation
      fetch(
        `${
          process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"
        }/api/generate-story-background`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId,
            userId,
            topic,
          }),
        }
      ).catch((err) => {
        console.error("⚠️ Failed to trigger background story generation:", err);
        // Silent failure - Story wird später in StoryGeneratorWrapper nachgeholt
      });
      console.log(
        "✅ Background story generation triggered after 1st turn for lesson:",
        lessonId
      );
    } catch (error) {
      console.error("⚠️ Exception while triggering background story:", error);
      // Weitermachen - Story wird später nachgeholt
    }
  }

  const result = await streamUI({
    model: openai(dialogModel),
    system: `Du bist ein freundlicher Lern-Coach für das Thema "${topic}".

${personalizedContext}

AUFGABE:
- Stelle gezielte Fragen, um das Vorwissen des Nutzers zu ermitteln
- Passe deine Fragen dynamisch an die Antworten an
- Sei motivierend und unterstützend
- Duze den Nutzer IMMER (verwende "du", "dein", "dir")

STRIKTE REGEL - EXAKT 5 FRAGEN:
- Der Nutzer hat bisher ${answerNum} von ${maxAns} Fragen beantwortet
- Du MUSST noch ${maxAns - answerNum} Frage(n) stellen
- Du hast KEIN Tool zur Verfügung - stelle einfach die nächste Frage!
- Das Assessment erfolgt automatisch nach Frage 5
- EINE prägnante Frage pro Message (1-2 Sätze)
- Keine Multiple-Choice, sondern offene Fragen
- Baue auf vorherigen Antworten auf

WICHTIG: Keine Zusammenfassungen, keine Bewertungen - nur Fragen stellen!
WICHTIG: IMMER "Du" verwenden, niemals "Sie"!`,
    messages: [...conversationHistory, { role: "user", content: userMessage }],

    text: async function* ({ content, done }) {
      if (done) {
        return <DialogMessage content={content} isComplete={true} />;
      }
      return <DialogMessage content={content} />;
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

  // ✅ NEU: Lade User-Profil für Personalisierung
  const session = await auth.api.getSession({ headers: await headers() });
  const userProfile = session?.user;

  // Extrahiere Profil-Daten (mit Fallbacks)
  const userAge = userProfile?.age;
  const userLanguage = userProfile?.language || "de";
  const userExperience = userProfile?.experienceLevel || "beginner";

  // ✅ NEU: Personalisierter Context
  const personalizedContext = `
USER-PROFIL (Personalisierung):
${userAge ? `- Alter: ${userAge} Jahre` : "- Alter: Nicht angegeben"}
${
  userExperience
    ? `- Erfahrungslevel: ${userExperience} (passe Komplexität der Fragen an!)`
    : ""
}
${
  userLanguage !== "de"
    ? `- Bevorzugte Sprache: ${userLanguage} (aber Dialog ist auf Deutsch)`
    : ""
}

WICHTIG: Passe deine Fragen an Alter und Erfahrungslevel an!
${userAge && userAge < 14 ? "- Nutze einfache, kindgerechte Sprache" : ""}
${
  userAge && userAge >= 18
    ? "- Nutze anspruchsvolle, professionelle Sprache"
    : ""
}
${
  userExperience === "beginner"
    ? "- Stelle grundlegende Fragen, erkläre Konzepte einfach"
    : ""
}
${
  userExperience === "advanced"
    ? "- Stelle tiefergehende Fragen, nutze Fachbegriffe"
    : ""
}
`;

  // Erstelle einen zusammengefassten Prompt basierend auf der Conversation-History
  const conversationSummary = conversationHistory
    .map(
      (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
    )
    .join("\n\n");

  const result = await streamUI({
    model: openai(assessmentModel),
    system: `Du bist ein Bildungs-Assessor, der das Wissen eines Nutzers bewertet.

${personalizedContext}

AUFGABE:
Analysiere das folgende Gespräch und bewerte das Vorwissen des Nutzers.

WICHTIG:
- Der Nutzer hat maximal 5 Fragen beantwortet
- Du MUSST JETZT das Wissen bewerten und die readyForStory Flag auf true setzen
- Keine weiteren Fragen stellen!
- Nutze das assessKnowledge-Tool mit den Ergebnissen
- Berücksichtige Alter und Erfahrungslevel bei der Bewertung`,
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
          // WICHTIG: saveDialogMetadata wirft KEINE Errors mehr!
          const metadataSaved = await saveDialogMetadata(lessonId, userId, {
            conversationHistory: conversationHistory,
            knowledgeLevel: knowledgeLevel,
            assessmentReasoning: reasoning,
            userResponses: conversationHistory
              .filter((msg) => msg.role === "user")
              .map((msg) => msg.content),
          });

          if (!metadataSaved) {
            console.warn(
              "⚠️ Dialog metadata could not be saved (forceAssessment) - continuing without it"
            );
            // Story/Quiz können auch ohne Metadata generiert werden (Fallback)
          }

          // Wechsle zur Story-Phase (OHNE redirect - updatePhase macht nur DB-Update)
          await updatePhase(lessonId, "story");

          // ⚠️ WICHTIG: 3000ms Delay für Supabase Transaction-Commit
          // Verhindert Race Condition zwischen DB-Write und redirect()
          // 200ms waren zu wenig - auch PC zeigt das Problem
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Invalidiere Cache NACH Phase-Update und Delay
          await invalidateLessonCache(lessonId);

          // Zeige Success-Message (User-Feedback vor Redirect)
          yield (
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
                🚀 Wechsle zur Story-Phase...
              </p>
            </div>
          );

          // JETZT redirect (DB ist committed, Cache ist invalidiert)
          redirect(`/lesson/${lessonId}`);

          // Dieser Code wird nie erreicht (redirect wirft Exception)
          return <div>Redirecting...</div>;
        },
      },
    },
  });

  return result.value;
}
