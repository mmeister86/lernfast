"use client";

/**
 * Story-Phase Component
 * Narratives Lernen mit Kapiteln und interaktiven Visualisierungen
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ModernVisualization } from "./modern-visualization";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { TTSPlayer } from "./tts-player";
import type { StoryChapter } from "@/lib/lesson.types";

interface StoryPhaseProps {
  chapters: StoryChapter[];
  lessonId: string;
  userId: string;
  topic: string;
  lessonType: "micro_dose" | "deep_dive";
}

export function StoryPhase({ chapters, lessonId, userId, topic, lessonType }: StoryPhaseProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userLanguage = session?.user?.language || "de";

  const [currentChapter, setCurrentChapter] = useState(0);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  if (!chapters || chapters.length === 0) {
    return (
      <div className="p-8 bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-xl font-extrabold text-center">
          ⚠️ Keine Story-Kapitel verfügbar
        </p>
      </div>
    );
  }

  const currentChapterData = chapters[currentChapter];
  const isLastChapter = currentChapter === chapters.length - 1;

  const handleNext = async () => {
    if (isLastChapter) {
      // ✅ NEU: Generiere Quiz-Fragen basierend auf Story
      setIsGeneratingQuiz(true);
      try {
        const { generateQuizFromStory } = await import("@/app/lesson/[id]/actions/actions-quiz-phase");
        await generateQuizFromStory(lessonId, userId, topic, lessonType);

        // Nach Quiz-Generierung: Reload Page um Quiz-Phase anzuzeigen
        window.location.reload();
      } catch (error) {
        console.error("Failed to generate quiz:", error);
        alert("Fehler beim Erstellen des Quiz. Bitte versuche es erneut.");
        setIsGeneratingQuiz(false);
      }
    } else {
      setCurrentChapter((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentChapter > 0) {
      setCurrentChapter((prev) => prev - 1);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <motion.h2
          key={currentChapter}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold"
        >
          📖 {currentChapterData.title}
        </motion.h2>
        <div className="flex items-center gap-3">
          {/* TTS Button für ganzes Kapitel */}
          <TTSPlayer
            key={currentChapter} // ✅ React re-mounted bei Chapter-Wechsel (neues Audio pro Kapitel)
            text={`${currentChapterData.narrative}\n\nDas Wichtigste:\n${currentChapterData.keyLearnings.join("\n")}`}
            language={userLanguage}
            variant="default"
            preGeneratedAudioUrl={currentChapterData.audioUrl} // ✅ Nutze vorab-generiertes Audio (falls vorhanden)
          />
          <span className="text-lg font-medium text-foreground/70">
            Kapitel {currentChapter + 1} von {chapters.length}
          </span>
          {/* Progress Dots */}
          <div className="flex gap-2">
            {chapters.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full border-2 border-black ${
                  i === currentChapter
                    ? "bg-[#FFC667]"
                    : i < currentChapter
                    ? "bg-[#00D9BE]"
                    : "bg-white"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Chapter Content with Animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentChapter}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Narrative */}
          <div className="bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8">
            <p className="text-lg font-medium leading-relaxed whitespace-pre-wrap text-black">
              {currentChapterData.narrative}
            </p>
          </div>

          {/* Visualization mit verbessertem Error-Handling */}
          {currentChapterData.visualizationData ? (
            <ModernVisualization
              type={currentChapterData.visualizationType}
              data={currentChapterData.visualizationData}
            />
          ) : (
            <div className="bg-gray-100 border-4 border-black rounded-[15px] p-6 text-center">
              <p className="text-lg font-medium text-gray-600">
                📊 Visualisierung wird erstellt...
              </p>
              <p className="text-sm font-medium text-gray-500 mt-2">
                Die KI generiert gerade die passende Grafik für dieses Kapitel.
              </p>
            </div>
          )}

          {/* Key Learnings */}
          <div className="bg-[#00D9BE] border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
            <h3 className="text-2xl font-extrabold mb-3 text-black">
              💡 Das Wichtigste
            </h3>
            <ul className="space-y-2">
              {currentChapterData.keyLearnings.map((learning, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-lg font-medium flex items-start gap-3 text-black"
                >
                  <span className="text-2xl">✓</span>
                  <span>{learning}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Quiz-Generierung Loading State */}
      {isGeneratingQuiz && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#662CB7] to-[#FB7DA8] border-4 border-black rounded-[15px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
            <h2 className="text-3xl font-extrabold text-white">
              🎯 Erstelle dein personalisiertes Quiz...
            </h2>
          </div>
          <p className="text-lg font-medium text-white/90 text-center">
            Basierend auf deinem Vorwissen und der Geschichte generiere ich jetzt{" "}
            {lessonType === "micro_dose" ? "5" : "7"} maßgeschneiderte Quiz-Fragen.
          </p>
          <p className="text-base font-medium text-white/70 text-center mt-2">
            Das dauert ca. 10-15 Sekunden...
          </p>
        </motion.div>
      )}

      {/* Navigation */}
      {!isGeneratingQuiz && (
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentChapter === 0}
            className="min-w-[150px]"
          >
            ← Vorheriges Kapitel
          </Button>

          <div className="flex-1 text-center">
            <p className="text-sm font-medium text-foreground/50">
              💡 Nimm dir Zeit, die Geschichte zu verstehen
            </p>
          </div>

          {isLastChapter ? (
            <Button
              onClick={handleNext}
              className="min-w-[150px] bg-[#662CB7] hover:bg-[#662CB7]/90"
            >
              Bereit für das Quiz? 🎯
            </Button>
          ) : (
            <Button onClick={handleNext} className="min-w-[150px]">
              Nächstes Kapitel →
            </Button>
          )}
        </div>
      )}

      {/* Chapter Overview */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-4 border-black rounded-[15px] p-4">
        <h4 className="text-lg font-extrabold mb-3">📚 Kapitel-Übersicht</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {chapters.map((chapter, i) => (
            <button
              key={i}
              onClick={() => setCurrentChapter(i)}
              className={`p-3 text-left border-2 border-black rounded-[10px] transition-all ${
                i === currentChapter
                  ? "bg-[#FFC667] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : i < currentChapter
                  ? "bg-[#00D9BE]/30 hover:bg-[#00D9BE]/50"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold">
                  {i < currentChapter ? "✓" : i + 1}
                </span>
                <span className="text-sm font-medium line-clamp-1">
                  {chapter.title}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
