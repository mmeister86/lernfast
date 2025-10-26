"use server";

/**
 * Text-to-Speech Server Actions
 * Generiert Audio mit OpenAI TTS basierend auf User-Sprache
 *
 * Features:
 * - Voice-Mapping nach Sprache (de, en, es, fr, it)
 * - Base64-Audio-Rückgabe für direkte Wiedergabe
 * - Error-Handling & Validation
 */

import OpenAI from "openai";

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Voice-Mapping basierend auf Sprache
 * OpenAI TTS unterstützt: alloy, echo, fable, onyx, nova, shimmer
 */
const VOICE_MAP: Record<string, string> = {
  de: "onyx", // Männliche, klare Stimme für Deutsch
  en: "nova", // Freundliche, neutrale Stimme für Englisch
  es: "alloy", // Neutrale Stimme für Spanisch
  fr: "fable", // Warme Stimme für Französisch
  it: "shimmer", // Helle, freundliche Stimme für Italienisch
};

/**
 * Generiert Audio aus Text mit OpenAI TTS
 *
 * @param text - Text zum Vorlesen (max. 4096 Zeichen)
 * @param language - Sprache (de, en, es, fr, it)
 * @returns Base64-encodierte Audio-URL (data:audio/mp3;base64,...)
 */
export async function generateSpeechAudio(
  text: string,
  language: string = "de",
  customVoice?: string // NEU: Optional custom voice
): Promise<{ audioUrl: string }> {
  // Validierung
  if (!text || text.trim().length === 0) {
    throw new Error("Text darf nicht leer sein.");
  }

  if (text.length > 4096) {
    throw new Error(
      "Text ist zu lang (max. 4096 Zeichen). Bitte kürze den Text."
    );
  }

  // Voice auswählen (customVoice hat Priorität)
  const voice = customVoice || VOICE_MAP[language] || "nova";

  // Kleine Text-Sanitization vor dem TTS-Call: HTML/Markdown entfernen, Whitespace normalisieren
  function sanitizeText(input: string): string {
    if (!input) return "";
    // Entferne HTML-Tags
    const noHtml = input.replace(/<[^>]*>/g, "");
    // Entferne Markdown-Code-Fences/backticks (einfacher Ansatz)
    const noFences = noHtml.replace(/```[\s\S]*?```/g, "").replace(/`/g, "");
    // Normalize whitespace
    const normalized = noFences.replace(/\s+/g, " ").trim();
    return normalized;
  }

  const sanitizedText = sanitizeText(text);
  const inputText = sanitizedText.slice(0, 4096);

  console.log(
    `[TTS] Generating speech - language: ${language}, voice: ${voice}${
      customVoice ? " (custom)" : ""
    }, original length: ${text.length}, sanitized length: ${inputText.length}`
  );

  try {
    // OpenAI TTS API Call
    const mp3Response = await openaiClient.audio.speech.create({
      model: "tts-1",
      voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: inputText,
    });

    console.log("[TTS] Audio received from OpenAI.");

    // Response ist ein Stream/Buffer, konvertiere zu ArrayBuffer
    const arrayBuffer = await mp3Response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Konvertiere zu Base64
    const base64Audio = buffer.toString("base64");
    const audioUrl = `data:audio/mp3;base64,${base64Audio}`;

    console.log(
      `[TTS] Audio generated successfully. Base64 size: ${base64Audio.length} bytes`
    );

    return { audioUrl };
  } catch (error) {
    console.error("[TTS] Generation failed:", error);
    console.error(
      "[TTS] Error details:",
      error instanceof Error ? error.message : String(error)
    );
    throw new Error(
      "Audio konnte nicht generiert werden. Bitte versuche es erneut."
    );
  }
}

/**
 * Batch-Generierung für Story-Kapitel
 * Generiert Audio für Narrative + Key Learnings
 *
 * @param narrative - Haupttext des Kapitels
 * @param keyLearnings - Array von Key Learnings
 * @param language - Sprache
 * @returns Audio-URL für kombinierten Text
 */
export async function generateChapterAudio(
  narrative: string,
  keyLearnings: string[],
  language: string = "de",
  customVoice?: string // NEU
): Promise<{ audioUrl: string }> {
  // Kombiniere Narrative + Key Learnings
  const keyLearningsText = keyLearnings
    .map((learning, i) => `${i + 1}. ${learning}`)
    .join("\n");

  const fullText = `${narrative}\n\nDas Wichtigste:\n${keyLearningsText}`;

  return generateSpeechAudio(fullText, language, customVoice);
}
