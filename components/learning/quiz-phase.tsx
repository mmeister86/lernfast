"use client";

/**
 * Quiz-Phase Component
 * Adaptives Quiz mit Score-Tracking und Erklärungen
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  updateQuizScore,
  invalidateLessonCache,
} from "@/app/lesson/[id]/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { QuizQuestion } from "@/lib/lesson.types";

interface QuizPhaseProps {
  questions: QuizQuestion[];
  lessonId: string;
  userId: string;
}

export function QuizPhase({ questions, lessonId, userId }: QuizPhaseProps) {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!questions || questions.length === 0) {
    return (
      <div className="p-8 bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-xl font-extrabold text-center">
          ⚠️ Keine Quiz-Fragen verfügbar
        </p>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const isCorrect = selectedAnswer === currentQ.correctAnswer;
  const isLastQuestion = currentQuestion === questions.length - 1;

  const handleAnswer = async (answerIndex: number) => {
    if (showExplanation) return;

    setSelectedAnswer(answerIndex);
    setShowExplanation(true);

    const isAnswerCorrect = answerIndex === currentQ.correctAnswer;
    const newScore = {
      correct: score.correct + (isAnswerCorrect ? 1 : 0),
      total: score.total + 1,
    };
    setScore(newScore);

    // Update Score in DB
    setIsSubmitting(true);
    try {
      await updateQuizScore(lessonId, userId, {
        correctAnswers: newScore.correct,
        totalQuestions: newScore.total,
        quizScore: Math.round((newScore.correct / newScore.total) * 100),
      });
    } catch (error) {
      console.error("Failed to update quiz score:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCurrentQuestion((prev) => prev + 1);
  };

  const handleFinish = async () => {
    // Transition zu Completed-Phase via API
    try {
      await fetch("/api/lesson/update-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, phase: "completed" }),
      });
      // Cache wird bereits in der API-Route invalidiert
      // Aktualisiere UI
      router.refresh();
    } catch (error) {
      console.error("Failed to complete lesson:", error);
    }
  };

  const scorePercentage =
    score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Score Header */}
      <div className="bg-[#662CB7] border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-extrabold">🎯 Quiz-Zeit!</h2>
            <p className="text-lg font-medium">
              Frage {currentQuestion + 1} von {questions.length}
            </p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-extrabold">{scorePercentage}%</p>
            <p className="text-base font-medium">
              {score.correct} / {score.total} richtig
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-3 bg-white/20 border-2 border-white rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FFC667] to-[#00D9BE] transition-all duration-500"
            style={{
              width: `${((currentQuestion + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        key={currentQuestion}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8"
      >
        {/* Question Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-extrabold flex-1">
            {currentQ.question}
          </h3>
          <span
            className={`px-3 py-1 text-sm font-extrabold border-2 border-black rounded-[10px] shrink-0 ${
              currentQ.difficulty === "easy"
                ? "bg-[#00D9BE]"
                : currentQ.difficulty === "medium"
                ? "bg-[#FFC667]"
                : "bg-[#FC5A46] text-white"
            }`}
          >
            {currentQ.difficulty === "easy"
              ? "LEICHT"
              : currentQ.difficulty === "medium"
              ? "MITTEL"
              : "SCHWER"}
          </span>
        </div>

        {/* Answer Options */}
        <div className="space-y-4">
          {currentQ.options.map((option, index) => (
            <motion.button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={showExplanation || isSubmitting}
              whileHover={!showExplanation ? { scale: 1.02 } : {}}
              whileTap={!showExplanation ? { scale: 0.98 } : {}}
              className={cn(
                "w-full p-6 text-left text-lg font-medium border-4 border-black rounded-[15px] transition-all",
                !showExplanation && "bg-white hover:bg-gray-50",
                showExplanation &&
                  index === currentQ.correctAnswer &&
                  "bg-[#00D9BE]",
                showExplanation &&
                  selectedAnswer === index &&
                  index !== currentQ.correctAnswer &&
                  "bg-[#FC5A46] text-white",
                (showExplanation || isSubmitting) &&
                  "cursor-not-allowed opacity-90"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-extrabold">
                  {["A", "B", "C", "D"][index]})
                </span>
                <span>{option}</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className={cn(
              "mt-6 p-6 border-4 border-black rounded-[15px]",
              isCorrect ? "bg-[#00D9BE]" : "bg-[#FFC667]"
            )}
          >
            <p className="text-xl font-extrabold mb-2">
              {isCorrect ? "✅ Richtig!" : "❌ Nicht ganz"}
            </p>
            <p className="text-lg font-medium">{currentQ.explanation}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Navigation */}
      {showExplanation && (
        <div className="flex justify-end">
          {isLastQuestion ? (
            <Button
              onClick={handleFinish}
              className="min-w-[200px] bg-[#00D9BE] hover:bg-[#00D9BE]/90 text-black"
              disabled={isSubmitting}
            >
              Quiz beenden! 🎉
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="min-w-[200px]"
              disabled={isSubmitting}
            >
              Nächste Frage →
            </Button>
          )}
        </div>
      )}

      {/* Question Overview */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-4 border-black rounded-[15px] p-4">
        <h4 className="text-lg font-extrabold mb-3">📊 Fragen-Übersicht</h4>
        <div className="flex flex-wrap gap-2">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-10 h-10 flex items-center justify-center font-extrabold border-2 border-black rounded-[10px] ${
                i === currentQuestion
                  ? "bg-[#FFC667]"
                  : i < currentQuestion
                  ? score.correct > i - (score.total - score.correct)
                    ? "bg-[#00D9BE]"
                    : "bg-[#FC5A46] text-white"
                  : "bg-white"
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
