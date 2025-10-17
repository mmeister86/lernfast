"use server";

/**
 * Story-Phase Server Actions
 * Narratives Lernen mit Kapiteln und interaktiven Visualisierungen
 */

import React, { type ReactNode } from "react";
import { streamUI } from "@ai-sdk/rsc";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { ChapterLoading } from "./helper-components";
import {
  updatePhase,
  getResearchData,
  getDialogMetadata,
} from "./database-helpers";
import type { ResearchData } from "@/lib/lesson.types";

// ============================================
// STORY-PHASE: Narrative Lernerfahrung
// ============================================

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

  // ✅ NEU: Lade Research-Daten + Dialog-Metadata für maximale Personalisierung
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

  // Erstelle Context-Block für den Prompt
  const researchContext = `
**RESEARCH-DATEN:**
- Facts: ${researchData.facts?.join(" | ") || "Keine verfügbar"}
- Konzepte: ${researchData.concepts?.map((c) => `${c.name} (${c.description})`).join(" | ") || "Keine verfügbar"}
- Beispiele: ${researchData.examples?.join(" | ") || "Keine verfügbar"}
- Key Takeaways: ${researchData.keyTakeaways?.join(" | ") || "Keine verfügbar"}
`;

  const dialogContext = dialogMetadata
    ? `
**DIALOG-ERKENNTNISSE:**
- Knowledge Level: ${dialogMetadata.knowledgeLevel}
- Assessment: ${dialogMetadata.assessmentReasoning || "Keine Bewertung verfügbar"}
- User Responses: ${dialogMetadata.userResponses?.slice(0, 3).join(" | ") || "Keine Antworten verfügbar"}
- Schwachstellen: ${dialogMetadata.storyPreferences?.weakPoints?.join(", ") || "Nicht identifiziert"}
- Stärken: ${dialogMetadata.storyPreferences?.strongPoints?.join(", ") || "Nicht identifiziert"}

**WICHTIG:** Passe die Story an das erkannte Level an:
- Nutze die User-Antworten, um zu verstehen, wo Wissenslücken sind
- Fokussiere auf die identifizierten Schwachstellen
- Baue auf den Stärken des Users auf
`
    : "";

  const result = await streamUI({
    model: openai(storyModel),
    system: `Du bist ein Storytelling-Experte, der komplexe Themen in fesselnde Geschichten verwandelt.

AUFGABE:
Erstelle eine MAXIMAL PERSONALISIERTE Lerngeschichte zum Thema "${topic}" mit ${chapterCount} Kapiteln.
User-Level: ${dialogMetadata?.knowledgeLevel || knowledgeLevel}

${researchContext}

${dialogContext}

STORY-STRUKTUR:
- Jedes Kapitel = eine narrative Szene (150-250 Wörter)
- Nutze Metaphern, konkrete Beispiele und visuelle Beschreibungen
- Baue auf vorherigen Kapiteln auf
- Ende mit einem "Aha!"-Moment

## VISUALISIERUNGEN (KRITISCH - JEDES KAPITEL BRAUCHT EINE!)

Du MUSST für jedes Kapitel eine passende Visualisierung mit ECHTEN, SINNVOLLEN DATEN erstellen.

### Verfügbare Visualisierungstypen

1. **timeline** - Zeitliche Entwicklungen, historische Verläufe, Fortschritt über Zeit
   - Struktur: Array mit MINDESTENS 4 Datenpunkten
   - Format: [{ name: "Zeitpunkt", value: numerischer_wert }, ...]
   - Beispiel: [{ name: "1990", value: 15 }, { name: "2000", value: 42 }, { name: "2010", value: 78 }, { name: "2020", value: 95 }]

2. **comparison** - Vergleiche zwischen mehreren Optionen/Konzepten/Technologien
   - Struktur: Array mit MINDESTENS 3 Datenpunkten
   - Format: [{ name: "Option_Name", value: bewertung_oder_metrik }, ...]
   - Beispiel: [{ name: "React", value: 85 }, { name: "Vue", value: 72 }, { name: "Angular", value: 68 }, { name: "Svelte", value: 79 }]

3. **process** - Schritt-für-Schritt Abläufe, Workflows, sequenzielle Prozesse
   - Struktur: Array mit MINDESTENS 3 Schritten
   - Format: [{ name: "Schritt_Bezeichnung", value: fortschritt_oder_aufwand }, ...]
   - value = Fortschritt in % ODER relativer Aufwand (0-100)
   - Beispiel: [{ name: "Anforderungen analysieren", value: 90 }, { name: "Architektur entwerfen", value: 75 }, { name: "Implementation starten", value: 45 }, { name: "Tests schreiben", value: 20 }]

4. **concept-map** - Verteilungen, Anteile, Proportionen zwischen Teilen eines Ganzen
   - Struktur: Array mit MINDESTENS 3 Datenpunkten
   - Format: [{ name: "Teil_Name", value: anteil_in_prozent }, ...]
   - Hinweis: Alle values sollten zusammen ca. 100 ergeben (Prozent-Anteile)
   - Beispiel: [{ name: "Frontend Dev", value: 40 }, { name: "Backend Dev", value: 35 }, { name: "DevOps", value: 15 }, { name: "Testing", value: 10 }]

### KRITISCHE REGELN (KEINE AUSNAHMEN!)

✅ IMMER zwischen 3-6 Datenpunkte pro Visualisierung (optimal: 4-5)
✅ NIEMALS leere Arrays [] - IMMER echte Daten mitgeben!
✅ Werte MÜSSEN zum Kapitel-Inhalt passen (keine generischen/zufälligen Zahlen!)
✅ Jeder Datenpunkt MUSS haben: { name: "String", value: Number }
✅ name = beschreibende Bezeichnung (z.B. "React", "Schritt 1", "2020")
✅ value = IMMER eine Zahl zwischen 0-100 (Prozent, Score, Fortschritt, etc.)
✅ Titel der Visualisierung sollte beschreibend sein (z.B. "Entwicklung der Nutzerzahlen")
✅ Passe Komplexität an Level an (beginner = einfache Begriffe, advanced = Fachbegriffe)`,
    prompt: `Erstelle eine ${chapterCount}-teilige Lerngeschichte zu "${topic}". Nutze das createChapter-Tool für jedes Kapitel.`,

    text: async function* ({ content }) {
      return (
        <div className="p-4 bg-white border-4 border-black rounded-[15px]">
          <p className="text-lg font-medium">{content}</p>
        </div>
      );
    },

    tools: {
      createChapter: {
        description: "Erstellt ein Story-Kapitel mit Visualisierung",
        inputSchema: z.object({
          chapterNumber: z.number().min(1).max(10),
          chapterTitle: z
            .string()
            .describe("Titel des Kapitels (kurz und prägnant)"),
          narrative: z
            .string()
            .min(150)
            .max(300)
            .describe("Die Story-Szene (150-250 Wörter)"),
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
        }),
        generate: async function* ({
          chapterNumber,
          chapterTitle,
          narrative,
          keyLearnings,
          visualizationType,
          visualizationData,
        }) {
          yield <ChapterLoading title={chapterTitle} />;

          // Debug-Logging: Detaillierte Inspektion der LLM-Response
          console.log("📊 createChapter Tool Called:", {
            chapterNumber,
            chapterTitle,
            visualizationType,
            visualizationDataRaw: JSON.stringify(visualizationData, null, 2),
            hasChartData: !!visualizationData.chartData,
            chartDataLength: visualizationData.chartData?.length || 0,
          });

          // ROBUSTE VALIDIERUNG der chartData
          let finalChartData = visualizationData.chartData;

          // Validierung 1: Ist chartData ein Array?
          if (!Array.isArray(finalChartData)) {
            console.error("❌ chartData ist kein Array:", typeof finalChartData);
            finalChartData = [];
          }

          // Validierung 2: Hat chartData mindestens 3 Einträge?
          if (finalChartData.length < 3) {
            console.warn(
              `⚠️ LLM returned invalid chartData (length: ${finalChartData.length}). Expected at least 3 items. Using fallback data.`
            );

            // Generiere sinnvolle Fallback-Daten basierend auf visualizationType
            switch (visualizationType) {
              case "timeline":
                finalChartData = [
                  { name: "Phase 1", value: 25 },
                  { name: "Phase 2", value: 55 },
                  { name: "Phase 3", value: 80 },
                  { name: "Phase 4", value: 100 },
                ];
                break;
              case "comparison":
                finalChartData = [
                  { name: "Option A", value: 75 },
                  { name: "Option B", value: 60 },
                  { name: "Option C", value: 85 },
                  { name: "Option D", value: 70 },
                ];
                break;
              case "process":
                finalChartData = [
                  { name: "Schritt 1", value: 100 },
                  { name: "Schritt 2", value: 80 },
                  { name: "Schritt 3", value: 60 },
                  { name: "Schritt 4", value: 30 },
                ];
                break;
              case "concept-map":
                finalChartData = [
                  { name: "Teil A", value: 40 },
                  { name: "Teil B", value: 30 },
                  { name: "Teil C", value: 20 },
                  { name: "Teil D", value: 10 },
                ];
                break;
            }
            console.log("✅ Fallback chartData generated:", finalChartData);
          }

          // Validierung 3: Prüfe Struktur jedes Datenpunkts
          const validatedChartData = finalChartData.map((item, index) => {
            if (!item.name || typeof item.name !== "string") {
              console.warn(`⚠️ Item ${index} hat invaliden 'name':`, item);
              item.name = `Punkt ${index + 1}`;
            }
            if (typeof item.value !== "number" || isNaN(item.value)) {
              console.warn(`⚠️ Item ${index} hat invaliden 'value':`, item);
              item.value = 50; // Default-Wert
            }
            return item;
          });

          console.log("✅ Final validated chartData:", {
            length: validatedChartData.length,
            data: validatedChartData,
          });

          // Speichere Kapitel in Datenbank (flashcard mit phase='story')
          const supabase = createServiceClient();
          const insertResult = await supabase.from("flashcard").insert({
            lesson_id: lessonId,
            question: chapterTitle, // Legacy-Feld
            phase: "story",
            order_index: chapterNumber - 1,
            learning_content: {
              story: {
                chapterTitle,
                narrative,
                keyPoints: keyLearnings,
                visualizations: [
                  {
                    type: visualizationType,
                    title: visualizationData.title,
                    chartData: validatedChartData, // ✅ Verwende validatedChartData
                  },
                ],
              },
            },
          });

          if (insertResult.error) {
            console.error("❌ Failed to save chapter:", insertResult.error);
          } else {
            console.log("✅ Chapter saved successfully:", {
              chapterNumber,
              chartDataLength: validatedChartData.length,
            });
          }

          return (
            <div className="mb-6 space-y-4">
              <div className="bg-gradient-to-br from-[#FFC667] to-[#FB7DA8] border-4 border-black rounded-[15px] p-6">
                <h3 className="text-2xl font-extrabold text-black mb-2">
                  📖 Kapitel {chapterNumber}: {chapterTitle}
                </h3>
                <p className="text-lg font-medium text-black leading-relaxed whitespace-pre-wrap">
                  {narrative}
                </p>
              </div>

              <div className="bg-[#00D9BE] border-4 border-black rounded-[15px] p-4">
                <h4 className="text-xl font-extrabold mb-2">
                  💡 Das Wichtigste:
                </h4>
                <ul className="space-y-1">
                  {keyLearnings.map((learning, i) => (
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
                  Visualisierung: {visualizationType} - "
                  {visualizationData.title}"
                </p>
              </div>
            </div>
          );
        },
      },
    },
  });

  // Nach allen Kapiteln: Update Phase zu 'quiz'
  await updatePhase(lessonId, "quiz");

  return result.value;
}
