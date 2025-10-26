"use server";

/**
 * Voice Dialog Server Actions
 * STT → LLM → TTS Pipeline für Voice-basierte Dialog-Phase
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  updateDialogScore,
  updatePhase,
  getResearchData,
  saveDialogMetadata,
  invalidateLessonCache,
  clearDialogHistory,
} from "./database-helpers";
import { generateSpeechAudio } from "./actions-tts";
import type { ResearchData } from "@/lib/lesson.types";

// ============================================
// TYPES
// ============================================

export interface ConversationEntry {
  role: "user" | "assistant";
  content: string; // Für Kompatibilität mit score.types.ts
  text: string; // Für Voice-spezifische Verwendung
  audioUrl?: string; // Nur für AI-Responses
  timestamp: string;
}

export interface VoiceDialogResult {
  userTranscript: string;
  aiResponse: string;
  aiAudioUrl: string;
  shouldAssess: boolean;
}

export interface VoiceAssessmentResult {
  summary: string;
  audioUrl: string;
  knowledgeLevel: "beginner" | "intermediate" | "advanced";
  confidence: number;
  reasoning: string;
}

// ============================================
// MAIN VOICE PROCESSING PIPELINE
// ============================================

/**
 * Hauptfunktion: Verarbeitet Voice-Input durch STT → LLM → TTS Pipeline
 */
export async function processVoiceInput(
  lessonId: string,
  userId: string,
  // Now expect a transcript and metadata instead of raw audio
  transcript: string,
  confidence: number | undefined,
  conversationHistory: ConversationEntry[],
  topic: string,
  currentAnswerCount: number
): Promise<VoiceDialogResult> {
  try {
    console.log(
      `🎤 Processing voice transcript for lesson ${lessonId}, answer ${currentAnswerCount}/5`
    );

    // Step 0: Lade User-Präferenzen
    const session = await auth.api.getSession({ headers: await headers() });
    const userVoice = session?.user?.ttsVoice || "nova";
    console.log(`🎙️ Using voice preference: ${userVoice}`);

    // Validate transcript with Zod
    const transcriptSchema = z.string().max(32768).min(1);
    const userTranscript = transcriptSchema.parse(transcript);
    console.log(`📝 Transcript received (${userTranscript.length} chars)`);

    const aiResponse = await processDialogResponse(
      lessonId,
      userId,
      userTranscript,
      conversationHistory,
      topic,
      currentAnswerCount
    );

    // Step 2: Text-to-Speech mit User-Präferenz
    const { audioUrl: aiAudioUrl } = await generateSpeechAudio(
      aiResponse,
      "de",
      userVoice
    );

    // Step 3: Determine if assessment is needed
    const shouldAssess = currentAnswerCount >= 5;

    console.log(`✅ Voice processing complete. Should assess: ${shouldAssess}`);

    return {
      userTranscript,
      aiResponse,
      aiAudioUrl,
      shouldAssess,
    };
  } catch (error) {
    console.error("❌ Voice processing failed:", error);
    throw new Error(
      "Sprachverarbeitung fehlgeschlagen. Bitte versuche es erneut."
    );
  }
}

// ============================================
// SPEECH-TO-TEXT (WHISPER)
// ============================================

/**
 * Transkribiert Audio-Blob zu Text mit OpenAI Whisper API
 */
async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    // Convert Blob to Buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // OpenAI Whisper API Call
    const openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const transcription = await openaiClient.audio.transcriptions.create({
      file: new File([buffer], "audio.webm", { type: "audio/webm" }),
      model: "whisper-1",
      language: "de", // Deutsch
      response_format: "text",
    });

    console.log(`🎯 Whisper transcription: "${transcription}"`);
    return transcription as string;
  } catch (error) {
    console.error("❌ Whisper transcription failed:", error);
    throw new Error(
      "Spracherkennung fehlgeschlagen. Bitte versuche es erneut."
    );
  }
}

// ============================================
// DIALOG PROCESSING (LLM)
// ============================================

/**
 * Verarbeitet Dialog-Response mit LLM (ohne streamUI)
 * Reuse der bestehenden continueDialog() Logik
 */
async function processDialogResponse(
  lessonId: string,
  userId: string,
  userMessage: string,
  conversationHistory: ConversationEntry[],
  topic: string,
  currentAnswerCount: number
): Promise<string> {
  const dialogModel = process.env.OPENAI_SELECTION_MODEL || "gpt-4o-mini";
  const answerNum = currentAnswerCount;
  const maxAns = 5;

  // ✅ Lade User-Profil für Personalisierung
  const session = await auth.api.getSession({ headers: await headers() });
  const userProfile = session?.user;

  const userAge = userProfile?.age;
  const userLanguage = userProfile?.language || "de";
  const userExperience = userProfile?.experienceLevel || "beginner";

  // ✅ Personalisierter Context
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

  // ✅ Trigger Background Story-Generierung nach 1. User-Antwort
  if (answerNum === 1) {
    try {
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
      });
      console.log(
        "✅ Background story generation triggered for lesson:",
        lessonId
      );
    } catch (error) {
      console.error("⚠️ Exception while triggering background story:", error);
    }
  }

  // Convert conversation history to LLM format
  const messages = conversationHistory.map((entry) => ({
    role: entry.role,
    content: entry.text,
  }));

  // Add current user message
  messages.push({ role: "user" as const, content: userMessage });

  // Generate response with OpenAI
  const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openaiClient.chat.completions.create({
    model: dialogModel,
    messages: [
      {
        role: "system",
        content: `Du bist ein freundlicher Lern-Coach für das Thema "${topic}".

${personalizedContext}

AUFGABE:
- Stelle gezielte Fragen, um das Vorwissen des Nutzers zu ermitteln
- Passe deine Fragen dynamisch an die Antworten an
- Sei motivierend und unterstützend
- Duze den Nutzer IMMER (verwende "du", "dein", "dir")

STRIKTE REGEL - EXAKT 5 FRAGEN:
- Der Nutzer hat bisher ${answerNum} von ${maxAns} Fragen beantwortet (erste Frage bereits gestellt)
- Du MUSST noch ${maxAns - answerNum} weitere Frage(n) stellen
- EINE prägnante Frage pro Message (1-2 Sätze)
- Keine Multiple-Choice, sondern offene Fragen
- Baue auf vorherigen Antworten auf

WICHTIG: Keine Zusammenfassungen, keine Bewertungen - nur Fragen stellen!
WICHTIG: IMMER "Du" verwenden, niemals "Sie"!`,
      },
      ...messages,
    ],
    max_tokens: 200,
    temperature: 0.7,
  });

  const aiResponse =
    response.choices[0]?.message?.content ||
    "Entschuldigung, ich konnte keine Antwort generieren.";
  console.log(`🤖 LLM Response: "${aiResponse}"`);

  return aiResponse;
}

// ============================================
// VOICE ASSESSMENT (nach 5. Frage)
// ============================================

/**
 * Force Assessment nach 5. Voice-Dialog Antwort
 * Analysiert Conversation, erstellt Assessment, wechselt Phase
 */
export async function forceVoiceAssessment(
  lessonId: string,
  userId: string,
  conversationHistory: ConversationEntry[],
  topic: string
): Promise<VoiceAssessmentResult> {
  try {
    console.log(`🎯 Starting voice assessment for lesson ${lessonId}`);

    // Step 1: LLM Assessment
    const assessment = await generateAssessment(conversationHistory, topic);
    console.log(
      `📊 Assessment: ${assessment.knowledgeLevel} (${assessment.confidence}%)`
    );

    // Step 2: Lade User-Präferenzen
    const session = await auth.api.getSession({ headers: await headers() });
    const userVoice = session?.user?.ttsVoice || "nova";
    console.log(`🎙️ Using voice preference for assessment: ${userVoice}`);

    // Step 3: TTS für Assessment-Summary mit User-Präferenz
    const summaryText = `Perfekt! Ich habe dein Wissen zu ${topic} analysiert.
Dein Level ist ${assessment.knowledgeLevel} mit ${assessment.confidence}% Konfidenz.
${assessment.reasoning}
Jetzt geht's weiter zur Story-Phase!`;

    const { audioUrl } = await generateSpeechAudio(
      summaryText,
      "de",
      userVoice
    );

    // Step 3: Datenbank-Updates (Parallel für Performance)
    await Promise.all([
      updateDialogScore(lessonId, userId, assessment.confidence),
      saveDialogMetadata(lessonId, userId, {
        conversationHistory: conversationHistory.map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
        knowledgeLevel: assessment.knowledgeLevel,
        assessmentReasoning: assessment.reasoning,
        userResponses: conversationHistory
          .filter((entry) => entry.role === "user")
          .map((entry) => entry.text),
      }),
      updatePhase(lessonId, "story"),
    ]);

    // Step 4: Check Story Generation Status
    const storyReady = await checkStoryGenerationStatus(lessonId);
    if (!storyReady) {
      console.warn("⚠️ Story not ready, triggering fallback generation");
      await generateStoryFallback(lessonId, topic);
    }

    // Step 5: Cache Invalidierung + Transaction Delay
    await invalidateLessonCache(lessonId);
    await delay(3000); // 3s für Supabase Transaction Commit

    // Optional: Clear Dialog History (GDPR)
    await clearDialogHistory(lessonId);

    console.log(`✅ Voice assessment complete for lesson ${lessonId}`);

    return {
      summary: summaryText,
      audioUrl,
      knowledgeLevel: assessment.knowledgeLevel,
      confidence: assessment.confidence,
      reasoning: assessment.reasoning,
    };
  } catch (error) {
    console.error("❌ Voice assessment failed:", error);
    throw new Error("Bewertung fehlgeschlagen. Bitte versuche es erneut.");
  }
}

/**
 * Generiert Assessment basierend auf Conversation History
 */
async function generateAssessment(
  conversationHistory: ConversationEntry[],
  topic: string
): Promise<{
  knowledgeLevel: "beginner" | "intermediate" | "advanced";
  confidence: number;
  reasoning: string;
}> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: z.object({
      knowledgeLevel: z.enum(["beginner", "intermediate", "advanced"]),
      confidence: z.number().min(0).max(100),
      reasoning: z.string(),
    }),
    prompt: `Analysiere dieses Gespräch zum Thema "${topic}" und bewerte das Wissen:

${conversationHistory
  .map((entry) => `${entry.role === "user" ? "User" : "AI"}: ${entry.text}`)
  .join("\n\n")}

Bewerte basierend auf:
- Tiefe der Antworten
- Verwendung von Fachbegriffen
- Verständnis von Zusammenhängen
- Fähigkeit, Beispiele zu nennen`,
  });

  return object;
}

// ============================================
// STORY GENERATION HELPERS
// ============================================

/**
 * Prüft ob Background Story-Generierung abgeschlossen ist
 */
async function checkStoryGenerationStatus(lessonId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: flashcards } = await supabase
    .from("flashcard")
    .select("id, phase, learning_content")
    .eq("lesson_id", lessonId)
    .eq("phase", "story");

  // Story ist fertig wenn mind. 3 Story-Flashcards existieren
  return !!(
    flashcards &&
    flashcards.length >= 3 &&
    flashcards.every((card) => card.learning_content?.story?.narrative)
  );
}

/**
 * Fallback: Synchrone Story-Generierung falls Background-Job fehlschlug
 */
async function generateStoryFallback(
  lessonId: string,
  topic: string
): Promise<void> {
  console.log("🚨 Fallback: Generating story synchronously");

  try {
    // Nutze bestehende Story-Generation Logik (aus V1.3)
    // Trigger background story generation via API
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"
      }/api/generate-story-background`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          userId: "system", // Fallback generation
          topic,
        }),
      }
    );

    if (response.ok) {
      console.log("✅ Fallback story generation triggered");
    } else {
      console.warn("⚠️ Fallback story generation failed");
    }
  } catch (error) {
    console.error("❌ Fallback story generation failed:", error);
    // Nicht kritisch - Story wird später in StoryGeneratorWrapper nachgeholt
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// ERROR HANDLING
// ============================================

// Error classes moved to lib/voice-dialog-errors.ts
// due to "use server" file restrictions

// ============================================
// INITIAL QUESTION GENERATION (Voice Chat)
// ============================================

/**
 * Generiert initiale Begrüßung + erste Fachfrage für Voice Chat
 * Kombiniert beides in einer Nachricht, um direkt mit fachlicher Frage zu starten
 */
export async function generateInitialQuestion(
  lessonId: string,
  topic: string,
  userId: string
): Promise<string> {
  try {
    console.log(`🎙️ Generating initial question for topic: ${topic}`);

    const session = await auth.api.getSession({ headers: await headers() });
    const userProfile = session?.user;

    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_SELECTION_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Du bist ein freundlicher Lern-Coach für das Thema "${topic}".

AUFGABE:
- Erstelle eine kurze Begrüßung (1-2 Sätze)
- Stelle DIREKT die erste fachliche Frage zum Thema
- Kombiniere beides in EINER Nachricht
- Duze den Nutzer IMMER

BEISPIEL:
"Hallo! Ich möchte dein Vorwissen zu ${topic} kennenlernen. Lass uns direkt starten: Was weißt du bereits über [Kernkonzept]?"

${
  userProfile?.age && userProfile.age < 14
    ? "- Nutze einfache, kindgerechte Sprache"
    : ""
}
${
  userProfile?.experienceLevel === "beginner"
    ? "- Stelle eine grundlegende Einstiegsfrage"
    : ""
}
${
  userProfile?.experienceLevel === "advanced"
    ? "- Stelle eine anspruchsvollere Frage"
    : ""
}
`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const questionText =
      response.choices[0]?.message?.content ||
      `Hallo! Ich möchte dein Vorwissen zu ${topic} kennenlernen. Lass uns direkt starten: Was weißt du bereits über dieses Thema?`;

    console.log(`✅ Generated initial question: "${questionText}"`);
    return questionText;
  } catch (error) {
    console.error("❌ Failed to generate initial question:", error);
    return `Hallo! Ich möchte dein Vorwissen zu ${topic} kennenlernen. Lass uns direkt starten: Was weißt du bereits über dieses Thema?`;
  }
}
