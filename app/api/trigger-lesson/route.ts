import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidateTag, revalidatePath } from "next/cache";
import {
  getCachedLessons,
  getCachedLesson,
  getCachedUserProfile,
} from "@/lib/supabase/queries";
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

    // Profildaten für Personalisierung laden
    const { data: userProfile } = await getCachedUserProfile(userId);

    // Default-Werte für fehlende Profildaten
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

    // Kartenanzahl: Micro Dose = 3-5 (fix), Deep Dive = User-Präferenz
    const cardCount =
      lessonType === "micro_dose" ? "3-5" : profileContext.preferredCardCount;

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

      // Prompt Engineering für D3.js Graph-Visualisierungen
      const systemPrompt = `Du bist ein Experte für didaktisch aufbereitete Lernkarten mit interaktiven D3.js-Graph-Visualisierungen.

**PERSONALISIERUNG:**
Du erhältst Profildaten des Nutzers und musst die Lernkarten entsprechend anpassen:

- **Erfahrungslevel**: Passe Komplexität und Vokabular an (beginner = einfache Sprache, advanced = Fachbegriffe)
- **Schwierigkeitsgrad**: Bestimmt Tiefe der Erklärungen (easy = Grundlagen, hard = Details & Edge Cases)
- **Alter**: Beeinflusst Beispiele und Ansprache (Kinder = spielerisch, Erwachsene = professionell)
- **Lernziele**: Wenn angegeben, fokussiere auf diese Ziele
- **Kartenanzahl**: Erstelle exakt die angeforderte Anzahl

**VISUALISIERUNGS-STRATEGIE:**

Erstelle für jede Lernkarte eine interaktive Graph-Visualisierung mit D3.js. Wähle das passende Layout basierend auf dem Inhalt:

1. **Force-Directed Layout** - Für Konzept-Maps mit vielen Beziehungen:
   - Beispiel: "Machine Learning Konzepte" → Zentrale Nodes (Supervised, Unsupervised) mit verzweigten Details
   - Nutze Links mit Labels für "ist-ein", "verwendet", "führt-zu" Beziehungen
   - Perfekt für: Abstrakte Konzepte, Definitionen, vernetzte Wissensstrukturen

2. **Hierarchical Layout** - Für klar strukturierte Top-Down-Informationen:
   - Beispiel: "HTTP Request Lifecycle" → Root (Client) → DNS → TCP → Request → Response
   - Perfekt für: Prozess-Flows, Abhängigkeiten, Schritt-für-Schritt Anleitungen

3. **Radial Layout** - Für zentrale Konzepte mit radialen Aspekten:
   - Beispiel: "React Hooks" → Zentrum (React), radiale Äste (useState, useEffect, etc.)
   - Perfekt für: Taxonomien, Feature-Übersichten, zentrale Themen mit Unterkategorien

4. **Cluster Layout** - Für gruppierte Themen-Kategorien:
   - Beispiel: "JavaScript Frameworks" → Cluster (React, Vue, Angular) mit Sub-Nodes
   - Perfekt für: Vergleiche, kategorisierte Listen, Gruppenstrukturen

**OUTPUT-FORMAT (JSON):**
{
  "cards": [
    {
      "question": "Was sind die Haupttypen von Machine Learning?",
      "visualizations": [
        {
          "type": "d3",
          "data": {
            "layout": "force-directed",
            "nodes": [
              { "id": "1", "label": "Machine Learning", "type": "concept" },
              { "id": "2", "label": "Supervised Learning", "type": "detail" },
              { "id": "3", "label": "Unsupervised Learning", "type": "detail" },
              { "id": "4", "label": "Classification", "type": "example" },
              { "id": "5", "label": "Regression", "type": "example" }
            ],
            "links": [
              { "source": "1", "target": "2", "label": "Typ" },
              { "source": "1", "target": "3", "label": "Typ" },
              { "source": "2", "target": "4", "label": "umfasst" },
              { "source": "2", "target": "5", "label": "umfasst" }
            ],
            "config": {
              "nodeRadius": 50,
              "linkDistance": 120
            }
          }
        }
      ]
    },
    {
      "question": "Wie läuft ein HTTP Request ab?",
      "visualizations": [
        {
          "type": "d3",
          "data": {
            "layout": "hierarchical",
            "nodes": [
              { "id": "1", "label": "Client", "type": "concept" },
              { "id": "2", "label": "DNS Lookup", "type": "detail" },
              { "id": "3", "label": "TCP Verbindung", "type": "detail" },
              { "id": "4", "label": "HTTP Request", "type": "detail" },
              { "id": "5", "label": "Server Verarbeitung", "type": "detail" },
              { "id": "6", "label": "HTTP Response", "type": "example" }
            ],
            "links": [
              { "source": "1", "target": "2" },
              { "source": "2", "target": "3" },
              { "source": "3", "target": "4" },
              { "source": "4", "target": "5" },
              { "source": "5", "target": "6" }
            ]
          }
        }
      ]
    }
  ]
}

**WICHTIGE REGELN:**
- Jede Karte MUSS genau eine D3-Visualisierung haben
- Nutze aussagekräftige Node-Labels (kurz, prägnant, max. 3-4 Wörter)
- Links sollten Labels haben, die die Beziehung beschreiben (optional bei hierarchical)
- Node-Types:
  * "concept" (Hauptkonzept, Peach-Farbe)
  * "detail" (Details, Weiß)
  * "example" (Beispiele, Pink)
  * "definition" (Definitionen, Lila)
- Deutsche Sprache für alle Labels und Fragen
- Minimum 3 Nodes, Maximum 15 Nodes pro Visualisierung
- Node-IDs MÜSSEN eindeutig sein und in Links korrekt referenziert werden
- Bei hierarchical/radial/cluster: Links bilden Baum-Struktur (ein Root-Node)`;

      // OpenAI API Call
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MICRO_DOSE_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Thema: ${topic.trim()}

**Nutzer-Profil:**
- Erfahrungslevel: ${profileContext.experienceLevel}
- Gewünschter Schwierigkeitsgrad: ${profileContext.preferredDifficulty}
${profileContext.age ? `- Alter: ${profileContext.age} Jahre` : ""}
${
  profileContext.learningGoals
    ? `- Lernziele: ${profileContext.learningGoals}`
    : ""
}
- Anzahl Karten: ${cardCount}
- Sprache: ${
              profileContext.language === "de"
                ? "Deutsch"
                : profileContext.language
            }

Erstelle bitte ${cardCount} Lernkarten, die auf dieses Profil zugeschnitten sind.`,
          },
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

      // Verarbeite jede Flashcard und speichere Visualisierungen
      // D3-Daten werden direkt gespeichert (keine Sanitization nötig)
      const flashcardInserts = flashcardsData.cards.map((card: any) => ({
        lesson_id: lesson.id,
        question: card.question,
        visualizations: card.visualizations || [],
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

    // 6. CACHE INVALIDIERUNG
    // Invalidiere Dashboard-Cache, damit neue Lesson sofort angezeigt wird
    revalidateTag("lessons"); // Invalidiert alle gecachten Lessons
    revalidatePath("/dashboard"); // Invalidiert Dashboard-Page

    // 7. CACHE WARMING
    // Befülle Cache direkt mit neuen Daten, damit der nächste Request schnell ist
    try {
      // Dashboard-Liste cachen
      await getCachedLessons(userId);

      // Lesson-Details cachen
      await getCachedLesson(lesson.id, userId);

      console.log(`✅ Cache warmed for user ${userId}, lesson ${lesson.id}`);
    } catch (warmingError) {
      // Cache Warming ist optional - bei Fehler einfach weitermachen
      console.warn("⚠️ Cache warming failed (non-critical):", warmingError);
    }

    // 8. ERFOLGREICHE RESPONSE
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
