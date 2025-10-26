"use client";

import { useCallback } from "react";
import { playAudio } from "@/lib/audio-utils";

interface UseAudioPlaybackParams {
  currentAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  setIsSpeaking: (value: boolean) => void;
  setCurrentAudioUrl: (url: string | null) => void;
}

export function useAudioPlayback({
  currentAudioRef,
  setIsSpeaking,
  setCurrentAudioUrl,
}: UseAudioPlaybackParams) {
  const playInitialAudio = useCallback(
    async (audioUrl: string) => {
      try {
        // Prevent double playback
        if (currentAudioRef.current && !currentAudioRef.current.paused) {
          console.log("⚠️ Audio already playing, skipping");
          return;
        }

        setIsSpeaking(true);
        const audio = await playAudio(audioUrl);
        currentAudioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          setCurrentAudioUrl(null);
        };

        setCurrentAudioUrl(audioUrl);
      } catch (error) {
        console.error("❌ Audio playback failed:", error);
        setIsSpeaking(false);
      }
    },
    [currentAudioRef, setIsSpeaking, setCurrentAudioUrl]
  );

  const playAIAudio = useCallback(
    async (audioUrl: string) => {
      try {
        setIsSpeaking(true);

        // Stop any current audio
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
        }

        const audio = await playAudio(audioUrl);
        currentAudioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          setCurrentAudioUrl(null);
        };

        setCurrentAudioUrl(audioUrl);
      } catch (error) {
        console.error("❌ AI audio playback failed:", error);
        setIsSpeaking(false);
      }
    },
    [currentAudioRef, setIsSpeaking, setCurrentAudioUrl]
  );

  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      setIsSpeaking(false);
      setCurrentAudioUrl(null);
    }
  }, [currentAudioRef, setIsSpeaking, setCurrentAudioUrl]);

  return {
    playInitialAudio,
    playAIAudio,
    stopAudio,
  };
}
