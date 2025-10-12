import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sanitizeMermaidCode } from "@/lib/utils";
import { revalidateTag, revalidatePath } from "next/cache";
import { getCachedLessons, getCachedLesson } from "@/lib/supabase/queries";
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

      // Prompt Engineering für intelligente Visualisierungs-Auswahl
      const systemPrompt = `Du bist ein Experte für didaktisch aufbereitete Lernkarten mit intelligenter Visualisierungs-Auswahl.

Erstelle 3-5 Lernkarten zum angegebenen Thema. Für jede Karte entscheide intelligent, welche Visualisierung am besten passt:

**Visualisierungs-Richtlinien:**

1. **Thesys (Concept Maps)** - Für konzeptionelle Zusammenhänge:
   - Abstrakte Begriffe und Definitionen
   - Hierarchische Wissensstrukturen
   - Beziehungen zwischen Konzepten
   - Beispiel: "Was ist Machine Learning?" → Nodes für Konzepte wie "Supervised", "Unsupervised"

2. **Mermaid Flowchart** - Für Prozesse und Abläufe:
   - Schritt-für-Schritt Anleitungen
   - Algorithmen und Entscheidungsbäume
   - Workflows und Pipelines
   - Beispiel: "HTTP Request Lifecycle" → Flowchart mit Request → Server → Response

3. **Mermaid Mindmap** - Für Themenübersichten:
   - Brainstorming-Strukturen
   - Themencluster
   - Kategorisierungen
   - Beispiel: "JavaScript Frameworks" → Zentrum "JS", Äste "React", "Vue", "Angular"

4. **Mermaid Sequence** - Für Interaktionen:
   - API-Kommunikation
   - Zeitliche Abläufe zwischen Akteuren
   - Message Passing
   - Beispiel: "OAuth Flow" → User → App → Auth Server → App → User

5. **Mermaid Class/ER** - Für Strukturen:
   - Datenmodelle
   - OOP-Klassendiagramme
   - Datenbankschemas
   - Beispiel: "E-Commerce DB Schema" → User --|> Order --|> Product

6. **Beide (Thesys + Mermaid)** - Für komplexe Themen:
   - Thesys für Konzepte + Flowchart für Prozess
   - Beispiel: "REST API Design" → Thesys (Prinzipien) + Flowchart (Request Handling)

**Output Format (JSON):**
{
  "cards": [
    {
      "question": "Wie funktioniert ein HTTP Request?",
      "visualizations": [
        {
          "type": "mermaid",
          "data": {
            "diagramType": "flowchart",
            "code": "flowchart TD\\n  A[Client] --> B[DNS Lookup]\\n  B --> C[TCP Connection]\\n  C --> D[HTTP Request]\\n  D --> E[Server Processing]\\n  E --> F[HTTP Response]"
          }
        }
      ]
    },
    {
      "question": "Was sind die REST Prinzipien?",
      "visualizations": [
        {
          "type": "thesys",
          "data": {
            "nodes": [
              { "id": "1", "label": "REST", "type": "concept" },
              { "id": "2", "label": "Stateless", "type": "detail" },
              { "id": "3", "label": "Cacheable", "type": "detail" }
            ],
            "edges": [
              { "from": "1", "to": "2", "label": "erfordert" },
              { "from": "1", "to": "3", "label": "unterstützt" }
            ],
            "layout": "hierarchical"
          }
        }
      ]
    }
  ]
}

**Wichtige Regeln:**
- Verwende IMMER deutsche Sprache für Fragen und Labels
- Mermaid Code MUSS valide Syntax haben (keine Tippfehler!)
- Newlines in Mermaid Code als \\n schreiben (escaped!)
- Mindestens 1 Visualisierung pro Karte, maximal 2 (Thesys + Mermaid)
- Wähle die Visualisierung basierend auf dem Lerninhalt intelligent aus
- Bei Prozessen: Flowchart, bei Konzepten: Thesys, bei Interaktionen: Sequence

**Mermaid Syntax-Regeln (KRITISCH):**
- IMMER Anführungszeichen um Node-Labels setzen: A["Label mit Text"]
- Besonders bei Sonderzeichen: Klammern (), Bindestriche -, Doppelpunkte :, Kommata ,
- Beispiel FALSCH: A --> B[Next.js (React)]
- Beispiel RICHTIG: A --> B["Next.js (React)"]
- Auch bei einfachen Labels sicher: A["Start"] --> B["Ende"]`;

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

      // Verarbeite jede Flashcard und speichere Visualisierungen
      // Mermaid-Code wird clientseitig gerendert (kein serverseitiges SVG mehr)
      const flashcardInserts = flashcardsData.cards.map((card: any) => {
        // Sanitize alle Mermaid-Visualisierungen
        const sanitizedVisualizations = (card.visualizations || []).map(
          (viz: any) => {
            if (viz.type === "mermaid" && viz.data?.code) {
              return {
                ...viz,
                data: {
                  ...viz.data,
                  code: sanitizeMermaidCode(viz.data.code),
                },
              };
            }
            return viz;
          }
        );

        return {
          lesson_id: lesson.id,
          question: card.question,
          visualizations: sanitizedVisualizations,
        };
      });

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
