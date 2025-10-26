"use client";

import { motion } from "framer-motion";

export function RecordingIndicator() {
  return (
    <div className="flex justify-end">
      <div className="p-4 bg-[#FC5A46] border-4 border-black rounded-[15px] inline-block">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="w-3 h-3 bg-white rounded-full"
          />
          <span className="text-white font-extrabold">🎤 Aufnahme...</span>
        </div>
      </div>
    </div>
  );
}
