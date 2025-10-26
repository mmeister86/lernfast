"use client";

import { motion } from "framer-motion";

export function TransitionScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-[#FFC667] to-[#FB7DA8]
                 flex items-center justify-center z-50"
    >
      <div
        className="bg-white border-4 border-black rounded-[15px]
                      shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-lg"
      >
        {/* Assessment-Summary */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold mb-2">
            ✅ Dialog abgeschlossen!
          </h2>
          <p className="text-lg font-medium">Dein Wissen wurde analysiert</p>
        </div>

        {/* Phase-Indicator Animation */}
        <div className="flex items-center justify-center gap-4">
          <span className="text-4xl animate-pulse">📝</span>
          <motion.span
            animate={{ x: [0, 20, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-2xl"
          >
            →
          </motion.span>
          <span className="text-4xl animate-pulse">📖</span>
        </div>

        {/* Loading Text */}
        <p className="text-center mt-6 text-lg font-extrabold animate-pulse">
          Bereite deine Geschichte vor...
        </p>
      </div>
    </motion.div>
  );
}
