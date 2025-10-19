"use server";

/**
 * Story-Phase Server Actions
 * Narratives Lernen mit Kapiteln und interaktiven Visualisierungen
 *
 * HINWEIS: Diese Version wurde refaktorisiert, um auf UI-Streaming zu verzichten
 * und die Stabilität zu erhöhen. Die gesamte Story wird nun auf einmal generiert.
 */

import { type ReactNode } from "react";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import {
  updatePhase,
  getResearchData,
  getDialogMetadata,
  invalidateLessonCache,
} from "./database-helpers";
import type { ResearchData } from "@/lib/lesson.types";

// ============================================
// STORY-PHASE: Narrative Lernerfahrung (Non-Streaming)
// ============================================

/**
 * HINWEIS: Background Story-Generation
 *
 * Story wird nach der 1. User-Antwort im Dialog getriggert via:
 * → POST /api/generate-story-background
 *
 * Dadurch ist die Story bei Dialog-Ende (nach ~30-60s) bereits fertig.
 * Falls nicht: StoryGeneratorWrapper generiert Story on-demand (Fallback).
 */

export async function generateStory(
  lessonId: string,
  userId: string,
  topic: string,
  knowledgeLevel: string,
  lessonType: "micro_dose" | "deep_dive"
): Promise<ReactNode> {
  const storyModel =
    lessonType === "micro_dose"
      ? process.env.OPENAI_MICRO_DOSE_MODEL || "gpt-4.1-mini"
      : process.env.OPENAI_DEEP_DIVE_MODEL || "o4-mini-deep-research";

  const chapterCount = lessonType === "micro_dose" ? 3 : 5;

  console.log(`🎬 Starting Story Generation for lesson: ${lessonId}`);

  const researchData = await getResearchData(lessonId);
  const dialogMetadata = await getDialogMetadata(lessonId, userId);

  if (!researchData) {
    console.error("❌ No research data found - cannot generate story");
    throw new Error("Research data is required for story generation");
  }

  console.log("📊 Loaded context:", {
    factsCount: researchData.facts?.length || 0,
    conceptsCount: researchData.concepts?.length || 0,
    dialogMetadata: !!dialogMetadata,
    knowledgeLevel: dialogMetadata?.knowledgeLevel || knowledgeLevel,
  });

  const researchContext = `
**RESEARCH-DATEN:**
- Facts: ${researchData.facts?.join(" | ") || "Keine verfügbar"}
- Konzepte: ${
    researchData.concepts
      ?.map((c) => `${c.name} (${c.description})`)
      .join(" | ") || "Keine verfügbar"
  }
- Beispiele: ${researchData.examples?.join(" | ") || "Keine verfügbar"}
- Key Takeaways: ${researchData.keyTakeaways?.join(" | ") || "Keine verfügbar"}
`;

  const dialogContext = dialogMetadata
    ? `
**DIALOG-ERKENNTNISSE:**
- Knowledge Level: ${dialogMetadata.knowledgeLevel}
- Assessment: ${
        dialogMetadata.assessmentReasoning || "Keine Bewertung verfügbar"
      }
- User Responses: ${
        dialogMetadata.userResponses?.slice(0, 3).join(" | ") ||
        "Keine Antworten verfügbar"
      }
- Schwachstellen: ${
        dialogMetadata.storyPreferences?.weakPoints?.join(", ") ||
        "Nicht identifiziert"
      }
- Stärken: ${
        dialogMetadata.storyPreferences?.strongPoints?.join(", ") ||
        "Nicht identifiziert"
      }

**WICHTIG:** Passe die Story an das erkannte Level an:
- Nutze die User-Antworten, um zu verstehen, wo Wissenslücken sind
- Fokussiere auf die identifizierten Schwachstellen
- Baue auf den Stärken des Users auf
`
    : "";

  const chapterSchema = z.object({
    chapterNumber: z.number().min(1).max(10),
    chapterTitle: z.string().describe("Titel des Kapitels (kurz und prägnant)"),
    narrative: z
      .string()
      .min(150)
      .max(2500)
      .describe("Die Story-Szene (200-350 Wörter, max 2500 Zeichen)"),
    keyLearnings: z
      .array(z.string())
      .min(2)
      .max(3)
      .describe("2-3 wichtige Lernpunkte"),
    visualizationType: z
      .enum(["timeline", "comparison", "process", "concept-map"])
      .describe(
        "Wähle den passenden Visualisierungstyp basierend auf dem Kapitel-Inhalt"
      ),
    visualizationData: z.object({
      title: z
        .string()
        .describe(
          "Beschreibender Titel für die Visualisierung (z.B. 'Entwicklung über Zeit', 'Vergleich der Optionen')"
        ),
      chartData: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                "Label für Datenpunkt (z.B. 'Tag 1', 'React', 'Schritt 1')"
              ),
            value: z
              .number()
              .describe(
                "Numerischer Wert für Datenpunkt (muss zum Thema passen!)"
              ),
          })
        )
        .min(3)
        .max(8)
        .describe(
          "Mindestens 3-8 Datenpunkte mit {name: string, value: number} Struktur"
        ),
    }),
  });

  const storySchema = z.object({
    chapters: z.array(chapterSchema).length(chapterCount),
  });

  type Story = z.infer<typeof storySchema>;

  let story: Story | null = null;
  let lastError: any = null;
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const { object } = await generateObject({
        model: openai(storyModel),
        schema: storySchema,
        system: `Du bist ein Storytelling-Experte, der komplexe Themen in fesselnde Geschichten verwandelt.
Deine Aufgabe ist es, eine komplette Lerngeschichte zu erstellen, die aus EXAKT ${chapterCount} Kapiteln besteht.
Gib das Ergebnis als einzelnes JSON-Objekt zurück, das der vorgegebenen Struktur entspricht.

Thema: "${topic}"
User-Level: ${dialogMetadata?.knowledgeLevel || knowledgeLevel}

${researchContext}
${dialogContext}

STORY-STRUKTUR:
- Jedes Kapitel = eine narrative Szene (200-350 Wörter, ca. 1400-2450 Zeichen)
- Nutze Metaphern, konkrete Beispiele und visuelle Beschreibungen
- Baue auf vorherigen Kapiteln auf
- Ende mit einem "Aha!"-Moment
- Halte jeden Abschnitt fokussiert und kompakt

## VISUALISIERUNGEN (KRITISCH - JEDES KAPITEL BRAUCHT EINE!)
Du MUSST für jedes Kapitel eine passende Visualisierung mit ECHTEN, SINNVOLLEN DATEN erstellen.

### Verfügbare Visualisierungstypen
1. **timeline**: Zeitliche Entwicklungen. [{ name: "Zeitpunkt", value: numerischer_wert }, ...]
2. **comparison**: Vergleiche. [{ name: "Option_Name", value: bewertung_oder_metrik }, ...]
3. **process**: Schritt-für-Schritt Abläufe. [{ name: "Schritt_Bezeichnung", value: fortschritt_oder_aufwand }, ...]
4. **concept-map**: Anteile eines Ganzen. [{ name: "Teil_Name", value: anteil_in_prozent }, ...]

### KRITISCHE REGELN (KEINE AUSNAHMEN!)
✅ IMMER zwischen 3-6 Datenpunkte pro Visualisierung (optimal: 4-5)
✅ NIEMALS leere Arrays [] - IMMER echte Daten mitgeben!
✅ Werte MÜSSEN zum Kapitel-Inhalt passen (keine generischen/zufälligen Zahlen!)
✅ Jeder Datenpunkt MUSS haben: { name: "String", value: Number }
✅ value = IMMER eine Zahl zwischen 0-100 (Prozent, Score, Fortschritt, etc.)
✅ Passe Komplexität an Level an (beginner = einfache Begriffe, advanced = Fachbegriffe)`,
        prompt: `Erstelle eine ${chapterCount}-teilige Lerngeschichte zu "${topic}". Gib die gesamte Geschichte als ein JSON-Objekt zurück, das ${chapterCount} Kapitel enthält.`,
      });
      story = object;
      break; // Success, exit loop
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Story generation attempt ${i + 1} failed. Retrying...`);
    }
  }

  if (!story) {
    console.error("❌ Story generation failed after all retries:", lastError);
    throw new Error("Die Story konnte nach mehreren Versuchen nicht erstellt werden.");
  }

  console.log(`✅ Story object generated with ${story.chapters.length} chapters.`);

  // Audio wird on-demand generiert (kein proaktives Caching wegen 2MB Next.js Limit)
  // Siehe docs/TTS-SUPABASE-STORAGE.md für langfristige Lösung mit Supabase Storage

  const chaptersToInsert = story.chapters.map((chapter, index) => {
    let finalChartData = chapter.visualizationData.chartData;

    if (!Array.isArray(finalChartData) || finalChartData.length < 3) {
      console.warn(
        `⚠️ LLM returned invalid chartData for chapter ${index + 1}. Using fallback.`
      );
      switch (chapter.visualizationType) {
        case "timeline":
          finalChartData = [
            { name: "Phase 1", value: 25 }, { name: "Phase 2", value: 55 },
            { name: "Phase 3", value: 80 }, { name: "Phase 4", value: 100 },
          ];
          break;
        default:
          finalChartData = [
            { name: "A", value: 75 }, { name: "B", value: 60 },
            { name: "C", value: 85 }, { name: "D", value: 70 },
          ];
      }
    }

    const validatedChartData = finalChartData.map((item, itemIndex) => ({
      name: item.name && typeof item.name === 'string' ? item.name : `Punkt ${itemIndex + 1}`,
      value: typeof item.value === 'number' && !isNaN(item.value) ? item.value : 50,
    }));

    return {
      lesson_id: lessonId,
      question: chapter.chapterTitle,
      phase: "story",
      order_index: index,
      learning_content: {
        story: {
          chapterTitle: chapter.chapterTitle,
          narrative: chapter.narrative,
          keyPoints: chapter.keyLearnings,
          visualizations: [
            {
              type: chapter.visualizationType,
              title: chapter.visualizationData.title,
              chartData: validatedChartData,
            },
          ],
          // audioUrl wird on-demand generiert (kein proaktives Caching wegen 2MB Next.js Limit)
        },
      },
    };
  });

  const supabase = createServiceClient();
  const { error: insertError } = await supabase
    .from("flashcard")
    .insert(chaptersToInsert);

  if (insertError) {
    console.error("❌ Failed to save chapters:", insertError);
    throw new Error("Fehler beim Speichern der Story-Kapitel.");
  }

  console.log(`✅ All ${story.chapters.length} chapters created successfully`);

  // Invalidiere Cache BEVOR Phase-Update, damit neue Kapitel sichtbar sind
  await invalidateLessonCache(lessonId);
  console.log("✅ Cache invalidated for lesson:", lessonId);

  // ✅ NICHT automatisch zu Quiz wechseln - User muss manuell "Weiter zum Quiz" klicken
  // Phase bleibt auf 'story' bis User den Button klickt
  console.log("✅ Story generation complete - phase stays on 'story'");

  return (
    <div>
      {story.chapters.map((chapter) => (
        <div key={chapter.chapterNumber} className="mb-6 space-y-4">
          <div className="bg-gradient-to-br from-[#FFC667] to-[#FB7DA8] border-4 border-black rounded-[15px] p-6">
            <h3 className="text-2xl font-extrabold text-black mb-2">
              📖 Kapitel {chapter.chapterNumber}: {chapter.chapterTitle}
            </h3>
            <p className="text-lg font-medium text-black leading-relaxed whitespace-pre-wrap">
              {chapter.narrative}
            </p>
          </div>
          <div className="bg-[#00D9BE] border-4 border-black rounded-[15px] p-4">
            <h4 className="text-xl font-extrabold mb-2">💡 Das Wichtigste:</h4>
            <ul className="space-y-1">
              {chapter.keyLearnings.map((learning, i) => (
                <li
                  key={i}
                  className="text-lg font-medium flex items-start gap-2"
                >
                  <span className="text-xl">✓</span>
                  <span>{learning}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border-4 border-black rounded-[15px] p-4">
            <p className="text-sm font-medium text-gray-600">
              Visualisierung: {chapter.visualizationType} - "
              {chapter.visualizationData.title}"
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
