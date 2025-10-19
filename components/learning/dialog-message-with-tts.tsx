"use client";

/**
 * Dialog Message mit TTS-Support
 * Wrapper um die Server-Component DialogMessage
 */

import { TTSPlayer } from "./tts-player";

interface DialogMessageWithTTSProps {
  content: string;
  language: string;
}

export function DialogMessageWithTTS({ content, language }: DialogMessageWithTTSProps) {
  return (
    <div className="mb-4">
      <div className="p-4 rounded-[15px] border-4 border-black bg-[#FFC667]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-lg font-medium text-black flex-1">{content}</p>
          <TTSPlayer text={content} language={language} variant="compact" />
        </div>
      </div>
    </div>
  );
}
