"use client";

/**
 * Learning-Progress Component
 * Zeigt den Fortschritt durch die 3 Phasen: Dialog → Story → Quiz
 */

import { motion } from "framer-motion";
import type { LearningPhase } from "@/lib/lesson.types";

interface LearningProgressProps {
  currentPhase: LearningPhase;
  lessonId: string;
}

const PHASES = [
  {
    id: "dialog" as const,
    label: "Dialog",
    icon: "💬",
    color: "#FFC667",
    description: "Wissensabfrage",
  },
  {
    id: "story" as const,
    label: "Story",
    icon: "📖",
    color: "#FB7DA8",
    description: "Narratives Lernen",
  },
  {
    id: "quiz" as const,
    label: "Quiz",
    icon: "🎯",
    color: "#662CB7",
    description: "Wissenstest",
  },
  {
    id: "completed" as const,
    label: "Fertig",
    icon: "🎉",
    color: "#00D9BE",
    description: "Abgeschlossen",
  },
];

export function LearningProgress({
  currentPhase,
  lessonId,
}: LearningProgressProps) {
  const currentIndex = PHASES.findIndex((p) => p.id === currentPhase);

  return (
    <div className="mb-8">
      {/* Desktop Progress */}
      <div className="hidden md:block bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-6 left-0 right-0 h-2 bg-gray-200 border-2 border-black rounded-full">
            <motion.div
              className="h-full bg-gradient-to-r from-[#FFC667] via-[#FB7DA8] to-[#662CB7] rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${(currentIndex / (PHASES.length - 1)) * 100}%`,
              }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Phase Steps */}
          {PHASES.map((phase, index) => {
            const isActive = phase.id === currentPhase;
            const isCompleted = index < currentIndex;
            const isFuture = index > currentIndex;

            return (
              <div
                key={phase.id}
                className="relative flex flex-col items-center z-10"
              >
                {/* Circle */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`w-12 h-12 rounded-full border-4 border-black flex items-center justify-center text-2xl transition-all ${
                    isActive
                      ? "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      : isCompleted
                      ? "bg-[#00D9BE]"
                      : "bg-white"
                  }`}
                  style={{
                    backgroundColor: isActive
                      ? "#fff"
                      : isCompleted
                      ? "#00D9BE"
                      : "#fff",
                  }}
                >
                  {isCompleted && !isActive ? "✓" : phase.icon}
                </motion.div>

                {/* Label */}
                <div className="mt-3 text-center">
                  <p
                    className={`text-sm font-extrabold ${
                      isActive
                        ? "text-black"
                        : isFuture
                        ? "text-gray-400"
                        : "text-black"
                    }`}
                  >
                    {phase.label}
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      isActive
                        ? "text-foreground/70"
                        : isFuture
                        ? "text-gray-300"
                        : "text-foreground/50"
                    }`}
                  >
                    {phase.description}
                  </p>
                </div>

                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activePhase"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FFC667] rounded-full"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Progress */}
      <div className="md:hidden bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center text-3xl bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            style={{
              backgroundColor: PHASES[currentIndex]?.color || "#fff",
            }}
          >
            {PHASES[currentIndex]?.icon}
          </div>
          <div className="flex-1">
            <p className="text-xl font-extrabold">
              {PHASES[currentIndex]?.label}
            </p>
            <p className="text-sm font-medium text-foreground/70">
              {PHASES[currentIndex]?.description}
            </p>
          </div>
        </div>

        {/* Mobile Progress Bar */}
        <div className="relative h-3 bg-gray-200 border-2 border-black rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#FFC667] via-[#FB7DA8] to-[#662CB7]"
            initial={{ width: 0 }}
            animate={{
              width: `${((currentIndex + 1) / PHASES.length) * 100}%`,
            }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Mobile Step Indicators */}
        <div className="flex justify-between mt-3">
          {PHASES.map((phase, index) => (
            <div
              key={phase.id}
              className={`text-xs font-medium ${
                index <= currentIndex ? "text-black" : "text-gray-400"
              }`}
            >
              {phase.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
