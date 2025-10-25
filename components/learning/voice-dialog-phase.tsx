"use client";

/**
 * Voice Dialog Phase Component
 * Voice-basierte Dialog-Phase mit STT → LLM → TTS Pipeline
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import {
  AudioRecorder,
  playAudio,
  handleAudioError,
  AudioError,
} from "@/lib/audio-utils";
// Server Actions werden dynamisch importiert
// import {
//   processVoiceInput,
//   forceVoiceAssessment,
//   type ConversationEntry,
//   type VoiceDialogResult,
//   type VoiceAssessmentResult,
// } from "@/app/lesson/[id]/actions/actions-voice-dialog";

// Local type definitions
interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
  text: string;
  audioUrl?: string;
  timestamp: string;
}

interface VoiceDialogResult {
  userTranscript: string;
  aiResponse: string;
  aiAudioUrl: string;
  shouldAssess: boolean;
}

interface VoiceAssessmentResult {
  summary: string;
  audioUrl: string;
  knowledgeLevel: "beginner" | "intermediate" | "advanced";
  confidence: number;
  reasoning: string;
}

interface VoiceDialogPhaseProps {
  lessonId: string;
  userId: string;
  topic: string;
}

const MAX_DIALOG_ANSWERS = 5;

export function VoiceDialogPhase({
  lessonId,
  userId,
  topic,
}: VoiceDialogPhaseProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userLanguage = session?.user?.language || "de";

  // ============================================
  // STATE MANAGEMENT
  // ============================================

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

  // Refs
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    if (!hasStarted) {
      setHasStarted(true);
      initializeVoiceDialog();
    }
  }, [hasStarted, lessonId, topic]);

  const initializeVoiceDialog = async () => {
    try {
      // Initialize AudioRecorder
      audioRecorderRef.current = new AudioRecorder();

      // Check microphone permission
      const hasPermission = await audioRecorderRef.current.checkPermission();
      setPermissionGranted(hasPermission);

      if (hasPermission) {
        // Start with initial question (TTS)
        await startInitialQuestion();
      } else {
        setError(
          "Mikrofon-Zugriff erforderlich. Bitte erlaube den Zugriff und lade die Seite neu."
        );
      }
    } catch (error) {
      console.error("❌ Voice dialog initialization failed:", error);
      setError("Initialisierung fehlgeschlagen. Bitte versuche es erneut.");
    }
  };

  const startInitialQuestion = async () => {
    try {
      setIsProcessing(true);

      // Generate initial question (reuse existing logic)
      const { startDialog } = await import(
        "@/app/lesson/[id]/actions/actions-dialog-phase"
      );
      const initialQuestion = await startDialog(lessonId, topic);

      // Extract text content for TTS
      const questionText =
        "Hallo! Ich möchte dein Vorwissen zu diesem Thema kennenlernen. Beantworte meine Fragen ehrlich - das hilft mir, die perfekte Lerngeschichte für dich zu erstellen!";

      // Generate TTS for initial question
      const { generateSpeechAudio } = await import(
        "@/app/lesson/[id]/actions/actions-tts"
      );
      const { audioUrl } = await generateSpeechAudio(
        questionText,
        userLanguage
      );

      // Play initial question
      await playInitialAudio(audioUrl);

      setConversationHistory([
        {
          role: "assistant",
          content: questionText,
          text: questionText,
          audioUrl,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("❌ Initial question failed:", error);
      setError("Erste Frage konnte nicht geladen werden.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================
  // AUDIO HANDLING
  // ============================================

  const playInitialAudio = async (audioUrl: string) => {
    try {
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
  };

  const playAIAudio = async (audioUrl: string) => {
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
  };

  // ============================================
  // RECORDING HANDLERS
  // ============================================

  const startRecording = async () => {
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
      await audioRecorderRef.current.startRecording();
      console.log("🎤 Recording started");
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      const audioError = handleAudioError(error);
      setError(audioError.message);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!audioRecorderRef.current || !isRecording) {
      return;
    }

    try {
      setIsRecording(false);
      setIsProcessing(true);

      const audioBlob = await audioRecorderRef.current.stopRecording();
      console.log(`🎤 Recording stopped, size: ${audioBlob.size} bytes`);

      // Process voice input
      await handleVoiceInput(audioBlob);
    } catch (error) {
      console.error("❌ Failed to stop recording:", error);
      const audioError = handleAudioError(error);
      setError(audioError.message);
      setIsProcessing(false);
    }
  };

  // ============================================
  // VOICE INPUT PROCESSING
  // ============================================

  const handleVoiceInput = async (audioBlob: Blob) => {
    try {
      const newAnswerCount = userAnswerCount + 1;

      // Process voice input through STT → LLM → TTS pipeline
      const { processVoiceInput } = await import(
        "@/app/lesson/[id]/actions/actions-voice-dialog"
      );
      const result: VoiceDialogResult = await processVoiceInput(
        lessonId,
        userId,
        audioBlob,
        conversationHistory,
        topic,
        newAnswerCount
      );

      // Add user transcript to conversation
      const userEntry: ConversationEntry = {
        role: "user",
        content: result.userTranscript,
        text: result.userTranscript,
        timestamp: new Date().toISOString(),
      };

      // Add AI response to conversation
      const aiEntry: ConversationEntry = {
        role: "assistant",
        content: result.aiResponse,
        text: result.aiResponse,
        audioUrl: result.aiAudioUrl,
        timestamp: new Date().toISOString(),
      };

      setConversationHistory((prev) => [...prev, userEntry, aiEntry]);
      setUserAnswerCount(newAnswerCount);

      // Play AI response audio
      await playAIAudio(result.aiAudioUrl);

      // Check if assessment is needed
      if (result.shouldAssess) {
        await handleAssessment();
      }
    } catch (error) {
      console.error("❌ Voice input processing failed:", error);
      setError("Sprachverarbeitung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================
  // ASSESSMENT HANDLING
  // ============================================

  const handleAssessment = async () => {
    try {
      setIsCompleting(true);

      const { forceVoiceAssessment } = await import(
        "@/app/lesson/[id]/actions/actions-voice-dialog"
      );
      const assessment: VoiceAssessmentResult = await forceVoiceAssessment(
        lessonId,
        userId,
        conversationHistory,
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

      setConversationHistory((prev) => [...prev, assessmentEntry]);

      // Play assessment audio
      await playAIAudio(assessment.audioUrl);

      // Wait for audio to finish, then show transition
      if (currentAudioRef.current) {
        currentAudioRef.current.onended = async () => {
          await handleTransition(assessment);
        };
      } else {
        // Fallback if audio doesn't play
        setTimeout(() => handleTransition(assessment), 2000);
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
      setError("Bewertung fehlgeschlagen. Bitte versuche es erneut.");
      setIsCompleting(false);
    }
  };

  const handleTransition = async (assessment: VoiceAssessmentResult) => {
    // Show transition screen
    setShowTransition(true);

    // Wait for transition animation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Redirect to story phase
    window.location.href = `/lesson/${lessonId}`;
  };

  // ============================================
  // CLEANUP
  // ============================================

  useEffect(() => {
    return () => {
      // Cleanup audio recorder
      if (audioRecorderRef.current) {
        audioRecorderRef.current.cleanup();
      }

      // Cleanup current audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    };
  }, []);

  // ============================================
  // RENDER
  // ============================================

  const remainingAnswers = MAX_DIALOG_ANSWERS - userAnswerCount;
  const progressColor =
    remainingAnswers >= 3
      ? "bg-[#00D9BE]"
      : remainingAnswers >= 1
      ? "bg-[#FFC667]"
      : "bg-[#FC5A46]";

  // Permission denied fallback
  if (permissionGranted === false) {
    return (
      <div className="space-y-6">
        <div className="bg-[#FC5A46] border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
          <h2 className="text-2xl font-extrabold text-white mb-3">
            🎤 Mikrofon-Zugriff erforderlich
          </h2>
          <p className="text-lg font-medium text-white mb-4">
            Für die Sprachsteuerung benötigen wir Zugriff auf dein Mikrofon.
          </p>
          <div className="space-y-3">
            <p className="text-base font-medium text-white">
              1. Klicke auf "Mikrofon erlauben" in deinem Browser
            </p>
            <p className="text-base font-medium text-white">
              2. Lade die Seite neu
            </p>
            <p className="text-base font-medium text-white">
              3. Oder nutze die Text-Eingabe als Alternative
            </p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4 bg-white text-[#FC5A46] hover:bg-gray-100"
          >
            Seite neu laden
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-[#FC5A46] border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
          <h2 className="text-2xl font-extrabold text-white mb-3">⚠️ Fehler</h2>
          <p className="text-lg font-medium text-white mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-white text-[#FC5A46] hover:bg-gray-100"
          >
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header mit Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#FFC667] to-[#FB7DA8] border-4 border-black rounded-[15px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-extrabold text-black">
                🎤 Lass uns sprechen!
              </h2>
            </div>
            <p className="text-lg font-medium text-black/80">
              Ich möchte dein Vorwissen zu <strong>{topic}</strong>{" "}
              kennenlernen. Beantworte noch {remainingAnswers}{" "}
              {remainingAnswers === 1 ? "Frage" : "Fragen"}, dann tauchen wir in
              die Geschichte ein!
            </p>
          </div>
          <div
            className={`px-4 py-2 border-4 border-black rounded-[15px] ${progressColor} text-black font-extrabold`}
          >
            {userAnswerCount}/{MAX_DIALOG_ANSWERS}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-white/30 border-2 border-black rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all duration-300`}
            style={{
              width: `${(userAnswerCount / MAX_DIALOG_ANSWERS) * 100}%`,
            }}
          />
        </div>

        {/* Warning bei letzter Frage */}
        {userAnswerCount === MAX_DIALOG_ANSWERS - 1 && (
          <p className="mt-3 text-sm font-extrabold text-black">
            ⚠️ Das ist deine letzte Frage!
          </p>
        )}
      </motion.div>

      {/* Conversation History */}
      <div className="bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 min-h-[400px] max-h-[600px] overflow-y-auto">
        {conversationHistory.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg font-medium text-gray-400">
              {isProcessing
                ? "Verarbeite erste Frage..."
                : "Warte auf erste Frage..."}
            </p>
          </div>
        )}

        {conversationHistory.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="mb-4"
          >
            {entry.role === "user" ? (
              <UserMessage content={entry.text} />
            ) : (
              <AIMessage content={entry.text} audioUrl={entry.audioUrl} />
            )}
          </motion.div>
        ))}

        {/* Loading States */}
        {isProcessing && !isCompleting && <TypingIndicator />}
        {isRecording && <RecordingIndicator />}
        {isSpeaking && <SpeakingIndicator />}
      </div>

      {/* Voice Controls */}
      <div className="flex flex-col items-center gap-4">
        <Button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={
            isProcessing ||
            isSpeaking ||
            isCompleting ||
            userAnswerCount >= MAX_DIALOG_ANSWERS
          }
          className={`
            w-32 h-32 rounded-full border-4 border-black font-extrabold text-lg
            transition-all duration-100
            ${
              isRecording
                ? "bg-[#FC5A46] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] scale-110"
                : "bg-[#00D9BE] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:scale-105"
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isRecording ? "🎤 Spricht..." : "🎤 Drücken & Sprechen"}
        </Button>

        <p className="text-sm font-medium text-foreground/70 text-center">
          {isRecording
            ? "Spreche jetzt... (Loslassen zum Stoppen)"
            : isProcessing
            ? "Verarbeite deine Antwort..."
            : isSpeaking
            ? "AI antwortet..."
            : userAnswerCount >= MAX_DIALOG_ANSWERS
            ? "Dialog abgeschlossen ✓"
            : "Drücke und halte zum Sprechen"}
        </p>
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
        {showTransition && <TransitionScreen />}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// MESSAGE COMPONENTS
// ============================================

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] p-4 bg-[#00D9BE] border-4 border-black rounded-[15px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-lg font-medium text-black">{content}</p>
      </div>
    </div>
  );
}

function AIMessage({
  content,
  audioUrl,
}: {
  content: string;
  audioUrl?: string;
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] p-4 bg-[#FFC667] border-4 border-black rounded-[15px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-lg font-medium text-black">{content}</p>
        {audioUrl && (
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

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="p-4 bg-gray-100 border-4 border-black rounded-[15px] inline-block">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
            className="w-2 h-2 bg-black rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
            className="w-2 h-2 bg-black rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
            className="w-2 h-2 bg-black rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

function RecordingIndicator() {
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

function SpeakingIndicator() {
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

function TransitionScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-[#FFC667] to-[#FB7DA8]
                 flex items-center justify-center z-50"
    >
      <div
        className="bg-white border-4 border-black rounded-[15px]
                      shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-lg"
      >
        {/* Assessment-Summary */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold mb-2">
            ✅ Dialog abgeschlossen!
          </h2>
          <p className="text-lg font-medium">Dein Wissen wurde analysiert</p>
        </div>

        {/* Phase-Indicator Animation */}
        <div className="flex items-center justify-center gap-4">
          <span className="text-4xl animate-pulse">📝</span>
          <motion.span
            animate={{ x: [0, 20, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-2xl"
          >
            →
          </motion.span>
          <span className="text-4xl animate-pulse">📖</span>
        </div>

        {/* Loading Text */}
        <p className="text-center mt-6 text-lg font-extrabold animate-pulse">
          Bereite deine Geschichte vor...
        </p>
      </div>
    </motion.div>
  );
}
