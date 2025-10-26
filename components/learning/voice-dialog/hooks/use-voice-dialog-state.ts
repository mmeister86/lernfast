"use client";

import { useState, useRef, useEffect } from "react";
import type { ConversationEntry } from "../types";

/**
 * Custom Hook für Voice Dialog State Management
 * Verwaltet alle State-Variablen und Refs
 */
export function useVoiceDialogState() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null
  );
  const [userAnswerCount, setUserAnswerCount] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<
    ConversationEntry[]
  >([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPlayedInitialAudio, setHasPlayedInitialAudio] = useState(false);

  // Refs
  const audioRecorderRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  return {
    // State
    isRecording,
    setIsRecording,
    isProcessing,
    setIsProcessing,
    isSpeaking,
    setIsSpeaking,
    permissionGranted,
    setPermissionGranted,
    userAnswerCount,
    setUserAnswerCount,
    conversationHistory,
    setConversationHistory,
    isCompleting,
    setIsCompleting,
    hasStarted,
    setHasStarted,
    showTransition,
    setShowTransition,
    currentAudioUrl,
    setCurrentAudioUrl,
    error,
    setError,
    hasPlayedInitialAudio,
    setHasPlayedInitialAudio,
    // Refs
    audioRecorderRef,
    currentAudioRef,
  };
}
