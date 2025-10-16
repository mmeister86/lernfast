"use client";

/**
 * Completion-Screen Component
 * Zeigt Erfolgs-Screen nach Abschluss aller 3 Phasen
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { LessonScore } from "@/lib/score.types";

interface CompletionScreenProps {
  lessonId: string;
  score?: LessonScore | null;
  topic: string;
}

export function CompletionScreen({
  lessonId,
  score,
  topic,
}: CompletionScreenProps) {
  const router = useRouter();

  const totalScore = score?.total_score || 0;
  const dialogScore = score?.dialog_score || 0;
  const quizScore = score?.quiz_score || 0;

  // Bewertung basierend auf Gesamt-Score
  const getGrade = (score: number) => {
    if (score >= 90) return { emoji: "🏆", text: "Hervorragend!", color: "#00D9BE" };
    if (score >= 75) return { emoji: "⭐", text: "Sehr gut!", color: "#FFC667" };
    if (score >= 60) return { emoji: "👍", text: "Gut gemacht!", color: "#FB7DA8" };
    return { emoji: "💪", text: "Weiter so!", color: "#662CB7" };
  };

  const grade = getGrade(totalScore);

  return (
    <div className="space-y-8">
      {/* Success Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="bg-gradient-to-br from-[#00D9BE] to-[#0CBCD7] border-4 border-black rounded-[15px] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 text-center"
      >
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ delay: 0.2 }}
          className="text-8xl mb-4"
        >
          🎉
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-black mb-2">
          Glückwunsch!
        </h1>
        <p className="text-xl font-medium text-black/80">
          Du hast <strong>{topic}</strong> erfolgreich abgeschlossen!
        </p>
      </motion.div>

      {/* Score Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white border-4 border-black rounded-[15px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8"
      >
        <div className="text-center mb-8">
          <p className="text-6xl mb-4">{grade.emoji}</p>
          <h2 className="text-3xl font-extrabold mb-2">{grade.text}</h2>
          <div className="inline-flex items-center gap-3">
            <span className="text-6xl font-extrabold">{totalScore}%</span>
            <span className="text-lg font-medium text-foreground/70">
              Quiz-Score
            </span>
          </div>
        </div>

        {/* Score Breakdown - Quiz prominent, Dialog informativ */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Haupt-Score: Quiz */}
          <div className="bg-[#662CB7] border-4 border-black rounded-[15px] p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl font-extrabold">🎯 Quiz-Ergebnis</span>
              <span className="text-4xl font-extrabold">{quizScore}%</span>
            </div>
            <div className="h-3 bg-white/30 border-2 border-white rounded-full overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: `${quizScore}%` }}
              />
            </div>
            <p className="text-sm font-medium text-white/80 mt-3">
              Dies ist dein finaler Score!
            </p>
          </div>

          {/* Bonus-Info: Dialog */}
          <div className="bg-[#FFC667]/30 border-4 border-black rounded-[15px] p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-extrabold">💬 Dialog-Einschätzung</span>
              <span className="text-2xl font-extrabold">{dialogScore}%</span>
            </div>
            <div className="h-2 bg-gray-200 border-2 border-black rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FFC667]"
                style={{ width: `${dialogScore}%` }}
              />
            </div>
            <p className="text-sm font-medium text-foreground/70 mt-3">
              Dein geschätztes Vorwissen (nicht im Score enthalten)
            </p>
          </div>
        </div>

        {score && (
          <div className="mt-6 pt-6 border-t-4 border-black">
            <div className="flex items-center justify-between text-foreground/70">
              <span className="font-medium">
                {score.correct_answers} von {score.total_questions} Fragen
                richtig
              </span>
              <span className="font-medium">
                ⏱️ {Math.round(score.time_spent_seconds / 60)} Minuten
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-4 justify-center"
      >
        <Button
          onClick={() => router.push("/dashboard")}
          className="min-w-[200px]"
        >
          Zum Dashboard
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="min-w-[200px]"
        >
          Neue Lesson starten
        </Button>
      </motion.div>

      {/* Motivational Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center"
      >
        <p className="text-lg font-medium text-foreground/70">
          {totalScore >= 90
            ? "🌟 Fantastisch! Du hast das Thema perfekt gemeistert!"
            : totalScore >= 75
            ? "👏 Großartig! Du hast das Thema sehr gut verstanden!"
            : totalScore >= 60
            ? "💫 Gut gemacht! Mit etwas Übung wird es noch besser!"
            : "🚀 Weiter so! Übung macht den Meister!"}
        </p>
      </motion.div>
    </div>
  );
}

