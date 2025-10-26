"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AVATAR_LABELS, type AvatarPreference } from "@/lib/profile.types";
import { MAX_DIALOG_ANSWERS } from "../types";
import { useState } from "react";

// VoiceControls now displays live transcript and allows user correction before send

interface VoiceControlsProps {
  avatarPreference: AvatarPreference;
  isRecording: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  userAnswerCount: number;
  onToggleRecording: () => void;
  // Wired from recorder hook
  transcript: string;
  setTranscript: (s: string) => void;
  confidence?: number;
  onSendTranscript: () => Promise<void> | void;
}

export function VoiceControls({
  avatarPreference,
  isRecording,
  isProcessing,
  isSpeaking,
  userAnswerCount,
  onToggleRecording,
  transcript,
  setTranscript,
  confidence,
  onSendTranscript,
}: VoiceControlsProps) {
  const avatarInfo = AVATAR_LABELS[avatarPreference];
  const [isSending, setIsSending] = useState(false);

  // Note: The parent component will pass a handler via onToggleRecording that
  // triggers recording. When recording stops, the hook will call into the
  // parent's handler (which ultimately calls processVoiceInput). To allow
  // user correction we expose a small text area here; parent should wire
  // the final transcript when sending.

  return (
    <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
      {/* Avatar Display */}
      <div className="bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden w-full aspect-square">
        <img
          src={`/teachers/${avatarPreference}.jpeg`}
          alt={avatarInfo.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Microphone Button with Click-to-Toggle */}
      <div className="flex flex-col items-center gap-4">
        <Button
          onClick={onToggleRecording}
          aria-pressed={isRecording}
          aria-label={isRecording ? "Aufnahme stoppen" : "Aufnahme starten"}
          disabled={
            isProcessing || isSpeaking || userAnswerCount >= MAX_DIALOG_ANSWERS
          }
          className={cn(
            "w-32 h-32 rounded-full border-4 border-black font-extrabold text-lg",
            "transition-all duration-100 relative",
            isRecording
              ? "bg-[#FC5A46] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-pulse-ring"
              : "bg-[#E64747] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          )}
        >
          <svg
            className="w-12 h-12 text-gray-700"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </Button>
        <p className="text-sm font-medium text-foreground/70 text-center">
          {isRecording
            ? "Spreche jetzt... (Klick zum Stoppen)"
            : isProcessing
            ? "Verarbeite deine Antwort..."
            : isSpeaking
            ? "AI antwortet..."
            : userAnswerCount >= MAX_DIALOG_ANSWERS
            ? "Dialog abgeschlossen ✓"
            : "Klick zum Sprechen"}
        </p>

        {/* Transcript preview & manual edit */}
        <div className="w-full">
          <label className="block text-sm font-medium mb-2">
            Deine Antwort
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={
              isRecording
                ? "Spreche jetzt..."
                : "Hier kannst du deine Antwort bearbeiten"
            }
            className="w-full h-24 p-3 rounded-[15px] border-4 border-black font-medium"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-foreground/60">
              Confidence:{" "}
              {confidence ? `${Math.round(confidence * 100)}%` : "—"}
            </span>
            <Button
              onClick={async () => {
                setIsSending(true);
                try {
                  await onSendTranscript();
                } finally {
                  setIsSending(false);
                }
              }}
              size="sm"
              disabled={isSending || isProcessing}
            >
              {isSending ? "Sende…" : "Senden"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
