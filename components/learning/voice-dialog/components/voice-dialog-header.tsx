"use client";

import { motion } from "framer-motion";
import { MAX_DIALOG_ANSWERS } from "../types";

interface VoiceDialogHeaderProps {
  topic: string;
  userAnswerCount: number;
}

export function VoiceDialogHeader({
  topic,
  userAnswerCount,
}: VoiceDialogHeaderProps) {
  const remainingAnswers = MAX_DIALOG_ANSWERS - userAnswerCount;
  const progressColor =
    remainingAnswers >= 3
      ? "bg-[#00D9BE]"
      : remainingAnswers >= 1
      ? "bg-[#FFC667]"
      : "bg-[#FC5A46]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#FFC667] to-[#FB7DA8] border-4 border-black rounded-[15px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-extrabold text-black">
              🎤 Lass uns sprechen!
            </h2>
          </div>
          <p className="text-lg font-medium text-black/80">
            Ich möchte dein Vorwissen zu <strong>{topic}</strong> kennenlernen.
            Beantworte noch {remainingAnswers}{" "}
            {remainingAnswers === 1 ? "Frage" : "Fragen"}, dann tauchen wir in
            die Geschichte ein!
          </p>
        </div>
        <div
          className={`px-4 py-2 border-4 border-black rounded-[15px] ${progressColor} text-black font-extrabold`}
        >
          {userAnswerCount}/{MAX_DIALOG_ANSWERS}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 bg-white/30 border-2 border-black rounded-full overflow-hidden">
        <div
          className={`h-full ${progressColor} transition-all duration-300`}
          style={{
            width: `${(userAnswerCount / MAX_DIALOG_ANSWERS) * 100}%`,
          }}
        />
      </div>

      {/* Warning bei letzter Frage */}
      {userAnswerCount === MAX_DIALOG_ANSWERS - 1 && (
        <p className="mt-3 text-sm font-extrabold text-black">
          ⚠️ Das ist deine letzte Frage!
        </p>
      )}
    </motion.div>
  );
}
