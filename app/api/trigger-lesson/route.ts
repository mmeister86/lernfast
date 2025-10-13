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
    const { topic, refinedTopic, lessonType } = body;

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

    // refinedTopic ist optional (kann null sein)
    const targetTopic = refinedTopic || topic.trim();

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
        refined_topic: refinedTopic || null,
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

    // 5. MULTI-STAGE KI-GENERIERUNG (Research + Strukturierung)
    try {
      // Update Status zu 'processing'
      await supabase
        .from("lesson")
        .update({ status: "processing" })
        .eq("id", lesson.id);

      // OpenAI Client initialisieren
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // ============================================
      // STAGE 1: RESEARCH - Fakten & Konzepte sammeln
      // ============================================

      const researchModel =
        lessonType === "micro_dose"
          ? process.env.OPENAI_MICRO_DOSE_MODEL || "gpt-4.1-mini"
          : process.env.OPENAI_DEEP_DIVE_MODEL || "o4-mini-deep-research";

      const researchSystemPrompt = `Du bist ein Recherche-Experte, der tiefgehende, strukturierte Informationen zu Lernthemen sammelt.

**AUFGABE:**
Recherchiere umfassend zum angegebenen Thema und sammle:
1. Kernfakten und Definitionen
2. Wichtige Konzepte und Zusammenhänge
3. Praktische Beispiele
4. Relevante Details für tiefes Verständnis

**PERSONALISIERUNG:**
- Erfahrungslevel: ${profileContext.experienceLevel}
- Schwierigkeitsgrad: ${profileContext.preferredDifficulty}
${profileContext.age ? `- Alter: ${profileContext.age} Jahre` : ""}
${
  profileContext.learningGoals
    ? `- Lernziele: ${profileContext.learningGoals}`
    : ""
}

Passe Tiefe und Komplexität entsprechend an.

**OUTPUT-FORMAT (JSON):**
{
  "topic": "Thema",
  "facts": ["Fakt 1", "Fakt 2", ...],
  "concepts": [
    {
      "name": "Konzept-Name",
      "description": "Erklärung",
      "relationships": ["Beziehung zu anderen Konzepten"]
    }
  ],
  "examples": ["Beispiel 1", "Beispiel 2", ...],
  "keyTakeaways": ["Hauptpunkt 1", "Hauptpunkt 2", ...]
}`;

      const researchCompletion = await openai.chat.completions.create({
        model: researchModel,
        messages: [
          { role: "system", content: researchSystemPrompt },
          {
            role: "user",
            content: `Recherchiere umfassend zum Thema: ${targetTopic}

Anzahl der zu erstellenden Lernkarten: ${cardCount}
Sammle genug Material für hochwertige, tiefgehende Lernkarten.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const researchData = JSON.parse(
        researchCompletion.choices[0].message.content || "{}"
      );

      console.log(
        `✅ Research completed for topic: ${targetTopic} (${researchModel})`
      );

      // ============================================
      // STAGE 2: STRUCTURE - D3-Visualisierungen erstellen
      // ============================================

      const structureModel =
        process.env.OPENAI_STRUCTURE_MODEL || "gpt-4.1-mini";

      const structureSystemPrompt = `Du bist ein Experte für didaktisch aufbereitete Lernkarten mit interaktiven D3.js-Graph-Visualisierungen.

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
      "answer": "Ausführlicher erklärender Text (150-300 Wörter), der das Konzept detailliert erläutert. Nutze klare Struktur mit Absätzen. Keine Aufzählungen oder Bullet Points - fließender Text.",
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
      "answer": "Ausführlicher erklärender Text (150-300 Wörter) für dieses Konzept. Fließender, strukturierter Text ohne Bullet Points.",
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
- Jede Karte MUSS ein "answer"-Feld mit 150-300 Wörtern erklärendem Text haben
- Jede Karte MUSS genau eine D3-Visualisierung haben
- **CARD 1 (Übersicht)**: MUSS IMMER Radial Layout verwenden mit 4-6 Sub-Nodes für Gesamtüberblick
- **CARDS 2-X**: Wähle abwechslungsreiche Layouts basierend auf Inhalt (max 2x dasselbe Layout)
- **Answer-Text**: Fließender, strukturierter Text ohne Bullet Points oder Aufzählungen
- Nutze aussagekräftige Node-Labels (kurz, prägnant, max. 3-4 Wörter)
- Links sollten Labels haben, die die Beziehung beschreiben (optional bei hierarchical)
- Node-Types:
  * "concept" (Hauptkonzept, Peach-Farbe)
  * "detail" (Details, Weiß)
  * "example" (Beispiele, Pink)
  * "definition" (Definitionen, Lila)
- Deutsche Sprache für alle Labels, Fragen und Antworten
- Minimum 3 Nodes, Maximum 15 Nodes pro Visualisierung
- Node-IDs MÜSSEN eindeutig sein und in Links korrekt referenziert werden
- Bei hierarchical/radial/cluster: Links bilden Baum-Struktur (ein Root-Node)`;

      // Structure API Call mit Research-Daten
      const structureCompletion = await openai.chat.completions.create({
        model: structureModel,
        messages: [
          { role: "system", content: structureSystemPrompt },
          {
            role: "user",
            content: `Basierend auf den folgenden Recherche-Ergebnissen, erstelle ${cardCount} Lernkarten mit D3-Visualisierungen.

**RESEARCH-DATEN:**
${JSON.stringify(researchData, null, 2)}

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

**WICHTIG:**
- Card 1 = IMMER Radial Layout für Themenüberblick
- Cards 2-${cardCount} = Abwechslungsreiche Layouts (max 2x dasselbe)

Erstelle bitte hochwertige Lernkarten basierend auf den Research-Daten.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      // JSON Response parsen
      const flashcardsData = JSON.parse(
        structureCompletion.choices[0].message.content || "{}"
      );

      console.log(
        `✅ Structure completed: ${
          flashcardsData.cards?.length || 0
        } cards (${structureModel})`
      );

      // Validiere Layout-Verteilung
      if (flashcardsData.cards && Array.isArray(flashcardsData.cards)) {
        const layoutCounts: Record<string, number> = {};

        flashcardsData.cards.forEach((card: any, index: number) => {
          const layout = card.visualizations?.[0]?.data?.layout;
          if (layout) {
            layoutCounts[layout] = (layoutCounts[layout] || 0) + 1;
          }

          // Warnung wenn Card 1 nicht radial ist
          if (index === 0 && layout !== "radial") {
            console.warn(
              `⚠️ Card 1 sollte Radial Layout haben, hat aber: ${layout}`
            );
          }
        });

        // Warnung wenn ein Layout >2x vorkommt (außer radial bei nur 1 Card)
        const hasExcessiveLayout = Object.entries(layoutCounts).some(
          ([layout, count]) => {
            if (layout === "radial" && flashcardsData.cards.length === 1)
              return false;
            return count > 2;
          }
        );

        if (hasExcessiveLayout) {
          console.warn(`⚠️ Layout-Verteilung nicht optimal:`, layoutCounts);
        } else {
          console.log(`✅ Layout-Verteilung OK:`, layoutCounts);
        }
      }

      if (!flashcardsData.cards || !Array.isArray(flashcardsData.cards)) {
        throw new Error("Ungültiges OpenAI Response Format");
      }

      // Verarbeite jede Flashcard und speichere Visualisierungen + Answer-Text
      // D3-Daten werden direkt gespeichert (keine Sanitization nötig)
      const flashcardInserts = flashcardsData.cards.map((card: any) => ({
        lesson_id: lesson.id,
        question: card.question,
        answer: card.answer || null,
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
