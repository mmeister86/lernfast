import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * POST /api/suggest-topics
 *
 * Generiert 3 verfeinerte Topic-Vorschläge basierend auf User-Input
 * Verwendet OPENAI_SELECTION_MODEL für intelligente Topic-Verfeinerung
 *
 * SICHERHEIT:
 * - Prüft Better-Auth Session (serverseitig)
 * - Validiert Input
 * - Rate Limiting (später mit Upstash)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. AUTH CHECK: Ist User eingeloggt?
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht autorisiert. Bitte melde dich an." },
        { status: 401 }
      );
    }

    // 2. INPUT VALIDIERUNG
    const body = await request.json();
    const { topic } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json(
        { error: "Bitte gib ein gültiges Thema ein." },
        { status: 400 }
      );
    }

    // 3. OPENAI API VALIDIERUNG
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key nicht konfiguriert." },
        { status: 500 }
      );
    }

    // 4. OPENAI KI-GENERIERUNG (Topic Suggestions)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `Du bist ein Experte für didaktische Themenverfeinerung und Lerndesign.

**AUFGABE:**
Der Nutzer gibt ein breites Thema ein. Deine Aufgabe ist es, 3 präzise, lernbare Sub-Themen zu generieren, die:
1. Spezifisch und fokussiert sind (nicht zu breit)
2. Für Lernkarten gut geeignet sind
3. Verschiedene Aspekte des Hauptthemas abdecken
4. Interessant und relevant für Lernende sind

**OUTPUT-FORMAT (JSON):**
{
  "suggestions": [
    {
      "id": "1",
      "title": "Prägnanter Titel (max. 50 Zeichen)",
      "description": "Kurze Beschreibung was gelernt wird (max. 100 Zeichen)",
      "emoji": "Ein passendes Emoji"
    },
    {
      "id": "2",
      "title": "...",
      "description": "...",
      "emoji": "..."
    },
    {
      "id": "3",
      "title": "...",
      "description": "...",
      "emoji": "..."
    }
  ]
}

**WICHTIGE REGELN:**
- Verwende IMMER deutsche Sprache für title und description
- Wähle verschiedene Aspekte (z.B. Theorie, Praxis, Geschichte)
- Emoji sollte thematisch passen und visuell ansprechend sein
- Titel sollten prägnant und klar sein
- Beschreibungen sollten Lernziele kommunizieren`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_SELECTION_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Thema: ${topic.trim()}\n\nGeneriere 3 spezifische, lernbare Sub-Themen für dieses Thema.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    // JSON Response parsen
    const suggestionsData = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    if (
      !suggestionsData.suggestions ||
      !Array.isArray(suggestionsData.suggestions) ||
      suggestionsData.suggestions.length !== 3
    ) {
      throw new Error("Ungültiges OpenAI Response Format");
    }

    // Validiere jede Suggestion
    for (const suggestion of suggestionsData.suggestions) {
      if (
        !suggestion.id ||
        !suggestion.title ||
        !suggestion.description ||
        !suggestion.emoji
      ) {
        throw new Error("Suggestion fehlt erforderliche Felder");
      }
    }

    // 5. ERFOLGREICHE RESPONSE
    return NextResponse.json(
      {
        success: true,
        suggestions: suggestionsData.suggestions,
      },
      { status: 200 }
    );
  } catch (openaiError) {
    console.error("OpenAI generation error:", openaiError);

    return NextResponse.json(
      {
        error:
          "Fehler bei der Topic-Suggestion-Generierung. Bitte versuche es erneut.",
        details:
          process.env.NODE_ENV === "development"
            ? openaiError instanceof Error
              ? openaiError.message
              : String(openaiError)
            : undefined,
      },
      { status: 500 }
    );
  }
}
