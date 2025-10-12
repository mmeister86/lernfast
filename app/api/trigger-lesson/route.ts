import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import OpenAI from "openai";

/**
 * POST /api/trigger-lesson
 *
 * Erstellt eine neue Lesson in der Datenbank und generiert KI-Lernkarten
 * direkt über OpenAI mit Thesys/C1-Format.
 *
 * SICHERHEIT:
 * - Prüft Better-Auth Session (serverseitig)
 * - Validiert Input
 * - Rate Limiting (später mit Upstash)
 * - Premium-Check für Deep Dive (später mit Stripe)
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

    const userId = session.user.id;

    // 2. INPUT VALIDIERUNG
    const body = await request.json();
    const { topic, lessonType } = body;

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

    // TODO: Premium-Check für Deep Dive
    // if (lessonType === "deep_dive" && !session.user.isPremium) {
    //   return NextResponse.json(
    //     { error: "Deep Dive ist nur für Premium-Nutzer verfügbar." },
    //     { status: 403 }
    //   )
    // }

    // TODO: Rate Limiting mit Upstash
    // const rateLimitResult = await checkRateLimit(userId)
    // if (!rateLimitResult.success) {
    //   return NextResponse.json(
    //     { error: "Zu viele Anfragen. Bitte warte ein paar Minuten." },
    //     { status: 429 }
    //   )
    // }

    // 3. OPENAI API VALIDIERUNG
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key nicht konfiguriert." },
        { status: 500 }
      );
    }

    // 4. DATENBANK: Erstelle Lesson-Eintrag in Supabase
    const supabase = createServiceClient();

    const { data: lesson, error: dbError } = await supabase
      .from("lesson")
      .insert({
        user_id: userId,
        topic: topic.trim(),
        lesson_type: lessonType,
        status: "pending",
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

    // 5. OPENAI KI-GENERIERUNG
    try {
      // Update Status zu 'processing'
      await supabase
        .from("lesson")
        .update({ status: "processing" })
        .eq("id", lesson.id);

      // OpenAI Client initialisieren
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Prompt Engineering für Thesys/C1-Format
      const systemPrompt = `Du bist ein Experte für didaktisch aufbereitete Lernkarten.
Erstelle 3-5 Lernkarten zum angegebenen Thema im Thesys/C1-JSON-Format.

Jede Karte muss folgende Struktur haben:
{
  "cards": [
    {
      "question": "Prägnante Frage zum Konzept",
      "thesys_json": {
        "nodes": [
          { "id": "1", "label": "Hauptkonzept", "type": "concept" },
          { "id": "2", "label": "Detail 1", "type": "detail" }
        ],
        "edges": [
          { "from": "1", "to": "2", "label": "erklärt durch" }
        ],
        "layout": "hierarchical"
      }
    }
  ]
}

Wichtige Regeln:
- Verwende deutsche Sprache für alle Inhalte
- Erstelle aussagekräftige Fragen die zum Lernen anregen
- Nodes sollten Konzepte, Details und Beispiele enthalten
- Edges sollten logische Beziehungen zwischen Konzepten zeigen
- Verwende verschiedene Node-Types: "concept", "detail", "example", "definition"
- Layout sollte "hierarchical" oder "force-directed" sein`;

      // OpenAI API Call
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MICRO_DOSE_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Thema: ${topic.trim()}` },
        ],
        response_format: { type: "json_object" },
      });

      // JSON Response parsen
      const flashcardsData = JSON.parse(
        completion.choices[0].message.content || "{}"
      );

      if (!flashcardsData.cards || !Array.isArray(flashcardsData.cards)) {
        throw new Error("Ungültiges OpenAI Response Format");
      }

      // Flashcards in Supabase speichern
      const flashcardInserts = flashcardsData.cards.map((card: any) => ({
        lesson_id: lesson.id,
        question: card.question,
        thesys_json: card.thesys_json,
      }));

      const { error: flashcardError } = await supabase
        .from("flashcard")
        .insert(flashcardInserts);

      if (flashcardError) {
        throw new Error(`Flashcard Insert Error: ${flashcardError.message}`);
      }

      // Status auf 'completed' setzen
      await supabase
        .from("lesson")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", lesson.id);
    } catch (openaiError) {
      console.error("OpenAI generation error:", openaiError);

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
              ? openaiError instanceof Error
                ? openaiError.message
                : String(openaiError)
              : undefined,
        },
        { status: 500 }
      );
    }

    // 6. ERFOLGREICHE RESPONSE
    return NextResponse.json(
      {
        success: true,
        lessonId: lesson.id,
        status: "completed",
        message: "Deine Lernkarten wurden erfolgreich generiert!",
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
