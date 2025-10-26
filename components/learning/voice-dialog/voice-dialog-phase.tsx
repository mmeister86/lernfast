"use client";

/**
 * Voice Dialog Phase Component - Refactored
 * Voice-basierte Dialog-Phase mit STT → LLM → TTS Pipeline
 */

import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useSession } from "@/lib/auth-client";
import { type AvatarPreference } from "@/lib/profile.types";
import { AudioRecorder } from "@/lib/audio-utils";
import {
  ConversationEntry,
  VoiceDialogResult,
  type VoiceDialogPhaseProps,
} from "./types";
import { useVoiceDialogState } from "./hooks/use-voice-dialog-state";
import { useAudioRecorder } from "./hooks/use-audio-recorder";
import { useAudioPlayback } from "./hooks/use-audio-playback";
import { VoiceDialogHeader } from "./components/voice-dialog-header";
import { ConversationView } from "./components/conversation-view";
import { VoiceControls } from "./components/voice-controls";
import { PermissionError } from "./components/permission-error";
import { ErrorDisplay } from "./components/error-display";
import { TransitionScreen } from "./chat-ui/transition-screen";

export function VoiceDialogPhase({
  lessonId,
  userId,
  topic,
}: VoiceDialogPhaseProps) {
  const { data: session } = useSession();
  const userLanguage = session?.user?.language || "de";
  const avatarPreference =
    (session?.user?.avatarPreference as AvatarPreference) || "hanne";

  // Use Custom Hooks
  const state = useVoiceDialogState();

  const playback = useAudioPlayback({
    currentAudioRef: state.currentAudioRef,
    setIsSpeaking: state.setIsSpeaking,
    setCurrentAudioUrl: state.setCurrentAudioUrl,
  });

  const handleVoiceInput = async (result: {
    transcript: string;
    confidence?: number;
    durationMs?: number;
  }) => {
    try {
      const newAnswerCount = state.userAnswerCount + 1;

      // Process transcript through LLM → TTS pipeline
      const { processVoiceInput } = await import(
        "@/app/lesson/[id]/actions/actions-voice-dialog"
      );

      const processed: VoiceDialogResult = await processVoiceInput(
        lessonId,
        userId,
        result.transcript,
        result.confidence,
        state.conversationHistory,
        topic,
        newAnswerCount
      );

      // Add user transcript to conversation
      const userEntry: ConversationEntry = {
        role: "user",
        content: processed.userTranscript,
        text: processed.userTranscript,
        timestamp: new Date().toISOString(),
      };

      // Add AI response to conversation
      const aiEntry: ConversationEntry = {
        role: "assistant",
        content: processed.aiResponse,
        text: processed.aiResponse,
        audioUrl: processed.aiAudioUrl,
        timestamp: new Date().toISOString(),
      };

      state.setConversationHistory([
        ...state.conversationHistory,
        userEntry,
        aiEntry,
      ]);
      state.setUserAnswerCount(newAnswerCount);

      // Persist messages (best-effort, do not block UI on failure)
      try {
        const { saveDialogMessage } = await import("@/app/lesson/[id]/actions");
        // Save user message
        saveDialogMessage(lessonId, "user", processed.userTranscript).catch(
          (err) => console.warn("⚠️ saveDialogMessage(user) failed:", err)
        );
        // Save assistant message
        saveDialogMessage(lessonId, "assistant", processed.aiResponse).catch(
          (err) => console.warn("⚠️ saveDialogMessage(assistant) failed:", err)
        );
      } catch (err) {
        console.warn("⚠️ Failed to import saveDialogMessage:", err);
      }

      // Play AI response audio
      await playback.playAIAudio(processed.aiAudioUrl);

      // Check if assessment is needed
      if (processed.shouldAssess) {
        await handleAssessment();
      }
    } catch (error) {
      console.error("❌ Voice input processing failed:", error);
      state.setError(
        "Sprachverarbeitung fehlgeschlagen. Bitte versuche es erneut."
      );
    } finally {
      state.setIsProcessing(false);
    }
  };

  const recorder = useAudioRecorder({
    audioRecorderRef: state.audioRecorderRef,
    isRecording: state.isRecording,
    isProcessing: state.isProcessing,
    isSpeaking: state.isSpeaking,
    setIsRecording: state.setIsRecording,
    setIsProcessing: state.setIsProcessing,
    setError: state.setError,
    onRecordingStopped: handleVoiceInput,
  });

  const handleAssessment = async () => {
    try {
      state.setIsCompleting(true);

      const { forceVoiceAssessment } = await import(
        "@/app/lesson/[id]/actions/actions-voice-dialog"
      );
      const assessment = await forceVoiceAssessment(
        lessonId,
        userId,
        state.conversationHistory,
        topic
      );

      // Add assessment to conversation
      const assessmentEntry: ConversationEntry = {
        role: "assistant",
        content: assessment.summary,
        text: assessment.summary,
        audioUrl: assessment.audioUrl,
        timestamp: new Date().toISOString(),
      };

      state.setConversationHistory([
        ...state.conversationHistory,
        assessmentEntry,
      ]);

      // Play assessment audio
      await playback.playAIAudio(assessment.audioUrl);

      // Wait for audio to finish, then show transition
      if (state.currentAudioRef.current) {
        state.currentAudioRef.current.onended = async () => {
          await handleTransition();
        };
      } else {
        // Fallback if audio doesn't play
        setTimeout(() => handleTransition(), 2000);
      }

      // Fallback redirect after 8s total
      setTimeout(() => {
        if (!window.location.href.includes("/lesson/")) {
          console.log("🔄 Fallback redirect triggered");
          window.location.href = `/lesson/${lessonId}`;
        }
      }, 8000);
    } catch (error) {
      console.error("❌ Assessment failed:", error);
      state.setError("Bewertung fehlgeschlagen. Bitte versuche es erneut.");
      state.setIsCompleting(false);
    }
  };

  const handleTransition = async () => {
    // Show transition screen
    state.setShowTransition(true);

    // Wait for transition animation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Redirect to story phase
    window.location.href = `/lesson/${lessonId}`;
  };

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    if (!state.hasStarted) {
      state.setHasStarted(true);
      initializeVoiceDialog();
    }
  }, [state.hasStarted, lessonId, topic]);

  const initializeVoiceDialog = async () => {
    try {
      // Initialize AudioRecorder
      state.audioRecorderRef.current = new AudioRecorder();

      // Check microphone permission
      const hasPermission =
        await state.audioRecorderRef.current.checkPermission();
      state.setPermissionGranted(hasPermission);

      if (hasPermission) {
        // Start with initial question (TTS)
        await startInitialQuestion();
      } else {
        state.setError(
          "Mikrofon-Zugriff erforderlich. Bitte erlaube den Zugriff und lade die Seite neu."
        );
      }
    } catch (error) {
      console.error("❌ Voice dialog initialization failed:", error);
      state.setError(
        "Initialisierung fehlgeschlagen. Bitte versuche es erneut."
      );
    }
  };

  const startInitialQuestion = async () => {
    try {
      state.setIsProcessing(true);

      // Prevent double execution
      if (state.hasPlayedInitialAudio) {
        console.log("⚠️ Initial question already played, skipping");
        return;
      }

      // Get user's TTS voice preference
      const userVoice = (session?.user as any)?.ttsVoice || "nova";

      // Generate initial question with LLM (Begrüßung + erste Fachfrage kombiniert)
      const { generateInitialQuestion } = await import(
        "@/app/lesson/[id]/actions/actions-voice-dialog"
      );
      const questionText = await generateInitialQuestion(
        lessonId,
        topic,
        userId
      );

      // Generate TTS for initial question WITH USER'S VOICE PREFERENCE
      const { generateSpeechAudio } = await import(
        "@/app/lesson/[id]/actions/actions-tts"
      );
      const { audioUrl } = await generateSpeechAudio(
        questionText,
        userLanguage,
        userVoice
      );

      // Play audio FIRST (before adding to conversation)
      await playback.playInitialAudio(audioUrl);

      // Mark as played
      state.setHasPlayedInitialAudio(true);

      // THEN add to conversation history (after audio started)
      state.setConversationHistory([
        {
          role: "assistant",
          content: questionText,
          text: questionText,
          audioUrl: undefined,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("❌ Initial question failed:", error);
      state.setError("Erste Frage konnte nicht geladen werden.");
    } finally {
      state.setIsProcessing(false);
    }
  };

  // ============================================
  // CLEANUP
  // ============================================

  useEffect(() => {
    return () => {
      // Cleanup audio recorder
      if (state.audioRecorderRef.current) {
        state.audioRecorderRef.current.cleanup();
      }

      // Cleanup current audio
      if (state.currentAudioRef.current) {
        state.currentAudioRef.current.pause();
      }
    };
  }, []);

  // ============================================
  // RENDER
  // ============================================

  // Permission denied fallback
  if (state.permissionGranted === false) {
    return <PermissionError />;
  }

  // Error state
  if (state.error) {
    return (
      <ErrorDisplay
        error={state.error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <VoiceDialogHeader
        topic={topic}
        userAnswerCount={state.userAnswerCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <ConversationView
          conversationHistory={state.conversationHistory}
          isProcessing={state.isProcessing}
          isRecording={recorder.isRecording}
          isSpeaking={state.isSpeaking}
          isCompleting={state.isCompleting}
        />

        <VoiceControls
          avatarPreference={avatarPreference}
          isRecording={recorder.isRecording}
          isProcessing={state.isProcessing}
          isSpeaking={state.isSpeaking}
          userAnswerCount={state.userAnswerCount}
          onToggleRecording={recorder.toggleRecording}
          transcript={recorder.transcript}
          setTranscript={recorder.setTranscript}
          confidence={recorder.confidence}
          onSendTranscript={async () => {
            // Send current transcript to processing pipeline
            state.setIsProcessing(true);
            await handleVoiceInput({
              transcript: recorder.transcript,
              confidence: recorder.confidence,
            });
            state.setIsProcessing(false);
          }}
        />
      </div>

      {/* Hint */}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/50">
          💡 Tipp: Sei ehrlich bei deinen Antworten - das hilft mir, die
          perfekte Lerngeschichte für dich zu erstellen!
        </p>
      </div>

      {/* Transition Screen */}
      <AnimatePresence>
        {state.showTransition && <TransitionScreen />}
      </AnimatePresence>
    </div>
  );
}
