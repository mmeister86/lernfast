"use client";

import { cn } from "@/lib/utils";

interface AIMessageProps {
  content: string;
  audioUrl?: string;
  showAudioIndicator?: boolean;
  teacherAvatar?: string;
}

export function AIMessage({
  content,
  audioUrl,
  showAudioIndicator = true,
  teacherAvatar,
}: AIMessageProps) {
  return (
    <div className="flex gap-3 justify-start items-start">
      {teacherAvatar && (
        <img
          src={`/teachers/${teacherAvatar}.jpeg`}
          alt="Lehrer"
          className="w-12 h-12 rounded-[15px] border-4 border-black flex-shrink-0"
        />
      )}
      <div className="max-w-[80%] p-4 bg-[#FFC667] border-4 border-black rounded-[15px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-lg font-medium text-black">{content}</p>
        {audioUrl && showAudioIndicator && (
          <div className="mt-2">
            <span className="text-sm font-medium text-black/70">
              🔊 Audio verfügbar
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
