"use client";

/**
 * Story Generator Wrapper
 * Lädt Story-Kapitel aus DB ODER generiert sie LIVE, falls noch nicht vorhanden
 *
 * Flow:
 * 1. Prüft ob Story-Kapitel bereits in DB vorhanden
 * 2. Falls ja: Zeigt StoryPhase mit vorhandenen Kapiteln
 * 3. Falls nein: Generiert Story LIVE mit Dialog-Context via Server Action
 */

import { useState, useEffect } from "react";
import { StoryPhase } from "./story-phase";
import { generateStory } from "@/app/lesson/[id]/actions/actions-story-phase";
import type { StoryChapter } from "@/lib/lesson.types";
import { motion } from "framer-motion";

interface StoryGeneratorWrapperProps {
  lessonId: string;
  userId: string;
  topic: string;
  lessonType: "micro_dose" | "deep_dive";
  initialChapters: StoryChapter[];
}

export function StoryGeneratorWrapper({
  lessonId,
  userId,
  topic,
  lessonType,
  initialChapters,
}: StoryGeneratorWrapperProps) {
  const [chapters, setChapters] = useState<StoryChapter[]>(initialChapters);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Wenn keine Kapitel vorhanden: Generiere sie LIVE
  useEffect(() => {
    if (chapters.length === 0 && !isGenerating && !generationError) {
      setIsGenerating(true);

      // Trigger Story-Generierung
      generateStory(lessonId, userId, topic, "intermediate", lessonType)
        .then(() => {
          console.log("✅ Story generation completed - reloading page");
          // Nach Generierung: Reload Page um neue Kapitel zu laden
          window.location.reload();
        })
        .catch((error) => {
          console.error("❌ Story generation failed:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unbekannter Fehler bei der Story-Generierung";
          setGenerationError(errorMessage);
          setIsGenerating(false);
        });
    }
  }, [chapters, isGenerating, generationError, lessonId, userId, topic, lessonType]);

  // Loading State: Story wird generiert
  if (isGenerating) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#FFC667] to-[#FB7DA8] border-4 border-black rounded-[15px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
            <h2 className="text-3xl font-extrabold text-black">
              📖 Deine Geschichte wird geschrieben...
            </h2>
          </div>
          <p className="text-lg font-medium text-black/80 text-center">
            Basierend auf deinem Dialog erstelle ich jetzt eine personalisierte Lerngeschichte mit{" "}
            {lessonType === "micro_dose" ? "3" : "5"} Kapiteln.
          </p>
          <p className="text-base font-medium text-black/60 text-center mt-2">
            Das dauert ca. 15-25 Sekunden...
          </p>
        </motion.div>

        {/* Progress Animation */}
        <div className="bg-white border-4 border-black rounded-[15px] p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.3 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-[#00D9BE] border-2 border-black rounded-full flex items-center justify-center font-extrabold">
                  {step}
                </div>
                <p className="text-lg font-medium">
                  {step === 1 && "Analysiere Dialog-Erkenntnisse..."}
                  {step === 2 && "Erstelle personalisierte Kapitel..."}
                  {step === 3 && "Generiere interaktive Visualisierungen..."}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (generationError) {
    return (
      <div className="bg-[#FC5A46] border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8">
        <h2 className="text-3xl font-extrabold text-white mb-4">
          ⚠️ Story-Generierung fehlgeschlagen
        </h2>
        <p className="text-lg font-medium text-white/90 mb-4">
          {generationError}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-white text-black font-extrabold border-4 border-black rounded-[15px] hover:translate-x-1 hover:translate-y-1 transition-transform"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  // Success: Zeige Story-Phase
  return (
    <StoryPhase
      chapters={chapters}
      lessonId={lessonId}
      userId={userId}
      topic={topic}
      lessonType={lessonType}
    />
  );
}
