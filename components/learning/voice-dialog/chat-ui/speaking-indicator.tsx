"use client";

import { motion } from "framer-motion";

export function SpeakingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="p-4 bg-[#FFC667] border-4 border-black rounded-[15px] inline-block">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="w-3 h-3 bg-black rounded-full"
          />
          <span className="text-black font-extrabold">🔊 AI spricht...</span>
        </div>
      </div>
    </div>
  );
}
