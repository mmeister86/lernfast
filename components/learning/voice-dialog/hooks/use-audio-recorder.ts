"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { AudioRecorder, handleAudioError } from "@/lib/audio-utils";

interface UseAudioRecorderParams {
  audioRecorderRef: React.MutableRefObject<AudioRecorder | null>;
  isRecording: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  setIsRecording: (value: boolean) => void;
  setIsProcessing: (value: boolean) => void;
  setError: (error: string | null) => void;
  // We now send only the transcribed text back to the caller
  onRecordingStopped: (result: {
    transcript: string;
    confidence?: number;
    durationMs?: number;
  }) => void;
}

export function useAudioRecorder({
  audioRecorderRef,
  isRecording,
  isProcessing,
  isSpeaking,
  setIsRecording,
  setIsProcessing,
  setError,
  onRecordingStopped,
}: UseAudioRecorderParams) {
  const recognitionRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>("");
  const transcriptConfidenceRef = useRef<number | undefined>(undefined);
  const [transcript, setTranscript] = useState<string>("");
  const [confidence, setConfidence] = useState<number | undefined>(undefined);
  const startRecording = useCallback(async () => {
    if (
      !audioRecorderRef.current ||
      isRecording ||
      isProcessing ||
      isSpeaking
    ) {
      return;
    }

    try {
      setIsRecording(true);
      setError(null);

      // Start browser audio recorder (kept for compatibility/debugging)
      await audioRecorderRef.current.startRecording();

      // Start Web Speech API recognition if available (client-side STT)
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = "de-DE";
        recognitionRef.current.interimResults = true;
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onresult = (event: any) => {
          const resultText = Array.from(event.results)
            .map((r: any) => r[0].transcript)
            .join(" ")
            .trim();
          latestTranscriptRef.current = resultText;
          setTranscript(resultText);
          try {
            const conf = event.results[0][0]?.confidence;
            if (typeof conf === "number") {
              transcriptConfidenceRef.current = conf;
              setConfidence(conf);
            }
          } catch (e) {
            /* ignore confidence parsing errors */
          }
        };

        recognitionRef.current.onerror = (err: any) => {
          console.warn("SpeechRecognition error:", err);
        };

        recognitionRef.current.start();
      }

      console.log("🎤 Recording started");
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      const audioError = handleAudioError(error);
      setError(audioError.message);
      setIsRecording(false);
    }
  }, [
    audioRecorderRef,
    isRecording,
    isProcessing,
    isSpeaking,
    setIsRecording,
    setError,
  ]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          /* ignore */
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopRecording = useCallback(async () => {
    if (!audioRecorderRef.current || !isRecording) {
      return;
    }

    try {
      setIsRecording(false);
      setIsProcessing(true);

      const start = Date.now();

      // Stop speech recognition first (if running)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn("Failed to stop SpeechRecognition:", e);
        }
      }

      // Stop audio recorder (kept for compatibility)
      try {
        await audioRecorderRef.current.stopRecording();
      } catch (e) {
        console.warn("AudioRecorder.stopRecording failed:", e);
      }

      const durationMs = Date.now() - start;

      const finalTranscript = transcript || latestTranscriptRef.current || "";
      const finalConfidence = confidence || transcriptConfidenceRef.current;

      console.log(
        `🎤 Recording stopped, transcript length: ${finalTranscript.length}`
      );

      // Call callback with transcription result (text-only)
      await onRecordingStopped({
        transcript: finalTranscript,
        confidence: finalConfidence,
        durationMs,
      });
    } catch (error) {
      console.error("❌ Failed to stop recording:", error);
      const audioError = handleAudioError(error);
      setError(audioError.message);
      setIsProcessing(false);
    }
  }, [
    isRecording,
    setIsRecording,
    setIsProcessing,
    setError,
    onRecordingStopped,
    transcript,
    confidence,
  ]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    startRecording,
    stopRecording,
    toggleRecording,
    isRecording,
    transcript,
    setTranscript,
    confidence,
  };
}
