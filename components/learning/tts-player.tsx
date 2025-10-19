"use client";

/**
 * TTS Player Component
 * Generiert und spielt Audio-Ausgabe mit OpenAI TTS
 *
 * Features:
 * - On-demand Audio-Generierung via Server Action
 * - Loading & Playing States
 * - Automatisches Cleanup nach Wiedergabe
 * - Sprachauswahl basierend auf User-Profil
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface TTSPlayerProps {
  text: string;
  language: string;
  autoPlay?: boolean;
  variant?: "default" | "compact";
  preGeneratedAudioUrl?: string; // ✅ NEU: Vorab-generiertes Audio (optional)
}

export function TTSPlayer({
  text,
  language,
  autoPlay = false,
  variant = "default",
  preGeneratedAudioUrl
}: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(preGeneratedAudioUrl || null); // ✅ Nutze vorab-generiertes Audio
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-Play bei Mount (wenn autoPlay=true)
  useEffect(() => {
    if (autoPlay && !audioUrl) {
      handlePlay();
    }
  }, [autoPlay]);

  // Cleanup bei Component-Unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const handlePlay = async () => {
    // Bereits generiert? Direkt abspielen
    if (audioUrl) {
      playAudio(audioUrl);
      return;
    }

    // Audio generieren
    setIsLoading(true);
    setError(null);

    try {
      const { generateSpeechAudio } = await import("@/app/lesson/[id]/actions/actions-tts");
      const { audioUrl: url } = await generateSpeechAudio(text, language);
      setAudioUrl(url);
      playAudio(url);
    } catch (err) {
      console.error("TTS Generation Error:", err);
      setError("Audio konnte nicht generiert werden.");
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.play();
    setIsPlaying(true);

    audio.onended = () => {
      setIsPlaying(false);
    };

    audio.onerror = () => {
      setError("Wiedergabe fehlgeschlagen.");
      setIsPlaying(false);
    };
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // Compact Variant (kleine Icon-Button)
  if (variant === "compact") {
    return (
      <button
        onClick={isPlaying ? handleStop : handlePlay}
        disabled={isLoading}
        className="inline-flex items-center justify-center w-8 h-8 border-2 border-black rounded-full bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={isPlaying ? "Stop" : "Vorlesen"}
      >
        {isLoading ? "⏳" : isPlaying ? "⏸️" : "🔉"}
      </button>
    );
  }

  // Default Variant (Button mit Text)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex flex-col items-start gap-2"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={isPlaying ? handleStop : handlePlay}
        disabled={isLoading}
        className="gap-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
      >
        {isLoading && (
          <>
            <span className="animate-spin">⏳</span>
            Generiere Audio...
          </>
        )}
        {isPlaying && (
          <>
            <span className="animate-pulse">🔊</span>
            Läuft...
          </>
        )}
        {!isLoading && !isPlaying && (
          <>
            🔉 Vorlesen
          </>
        )}
      </Button>

      {error && (
        <p className="text-xs font-medium text-[#FC5A46]">
          ⚠️ {error}
        </p>
      )}
    </motion.div>
  );
}
