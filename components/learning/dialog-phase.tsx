"use client";

/**
 * Dialog-Phase Component
 * Interaktiver Wissens-Dialog mit KI-gesteuertem Assessment
 */

import { useState, useEffect, FormEvent, ReactNode } from "react";
import {
  startDialog,
  continueDialog,
  invalidateLessonCache,
} from "@/app/lesson/[id]/actions";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface DialogPhaseProps {
  lessonId: string;
  userId: string;
  topic: string;
}

const MAX_DIALOG_ANSWERS = 5;

export function DialogPhase({ lessonId, userId, topic }: DialogPhaseProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ReactNode[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userAnswerCount, setUserAnswerCount] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Initial-Frage vom LLM beim Component-Mount
  useEffect(() => {
    if (!hasStarted) {
      setHasStarted(true);
      setIsLoading(true);

      startDialog(lessonId, topic)
        .then((initialQuestion) => {
          setMessages([initialQuestion]);
          // Extrahiere Text-Content für History (vereinfacht)
          setConversationHistory([
            { role: "assistant", content: "Initial question asked" },
          ]);
        })
        .catch((error) => {
          console.error("Failed to start dialog:", error);
          setMessages([
            <ErrorMessage
              key="error-start"
              message="Entschuldigung, ich konnte keine Frage generieren. Bitte lade die Seite neu."
            />,
          ]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [hasStarted, lessonId, topic]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || userAnswerCount >= MAX_DIALOG_ANSWERS)
      return;

    setIsLoading(true);
    const newAnswerCount = userAnswerCount + 1;

    // User-Message zur UI hinzufügen
    const userMessageContent = input;
    setMessages((prev) => [
      ...prev,
      <UserMessage key={`user-${prev.length}`} content={userMessageContent} />,
    ]);

    // Zur Conversation-History hinzufügen
    const updatedHistory = [
      ...conversationHistory,
      { role: "user" as const, content: userMessageContent },
    ];
    setConversationHistory(updatedHistory);
    setUserAnswerCount(newAnswerCount);

    setInput("");

    try {
      // Bei 5. Antwort: forceAssessment aufrufen
      if (newAnswerCount === MAX_DIALOG_ANSWERS) {
        setIsCompleting(true);
        setIsLoading(false); // ✅ Unterdrücke Typing-Bubble während Assessment
        setMessages((prev) => [
          ...prev,
          <div
            key="assessing"
            className="p-4 bg-[#00D9BE] border-4 border-black rounded-[15px]"
          >
            <p className="text-lg font-extrabold text-black">
              ✅ Dialog abgeschlossen! Analysiere dein Wissen...
            </p>
          </div>,
        ]);

        const { forceAssessment } = await import("@/app/lesson/[id]/actions");
        const aiResponse = await forceAssessment(
          lessonId,
          userId,
          updatedHistory,
          topic
        );
        setMessages((prev) => [...prev, aiResponse]);

        // Invalidiere Cache nach Dialog-Abschluss
        await invalidateLessonCache(lessonId);
        router.refresh(); // Aktualisiere UI
      } else {
        // Normale Dialog-Fortsetzung
        const aiResponse = await continueDialog(
          lessonId,
          userId,
          userMessageContent,
          updatedHistory,
          topic,
          newAnswerCount,
          MAX_DIALOG_ANSWERS
        );

        setMessages((prev) => [...prev, aiResponse]);

        // Extrahiere Text-Content für History (vereinfacht)
        setConversationHistory((prev) => [
          ...prev,
          { role: "assistant", content: "Response received" },
        ]);
      }
    } catch (error) {
      console.error("Dialog error:", error);
      setMessages((prev) => [
        ...prev,
        <ErrorMessage
          key={`error-${prev.length}`}
          message="Entschuldigung, da ist etwas schiefgelaufen. Bitte versuche es erneut."
        />,
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const remainingAnswers = MAX_DIALOG_ANSWERS - userAnswerCount;
  const progressColor =
    remainingAnswers >= 3
      ? "bg-[#00D9BE]"
      : remainingAnswers >= 1
      ? "bg-[#FFC667]"
      : "bg-[#FC5A46]";

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
            <h2 className="text-3xl font-extrabold text-black mb-2">
              📚 Lass uns reden!
            </h2>
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

      {/* Messages Container */}
      <div className="bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 min-h-[400px] max-h-[600px] overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg font-medium text-gray-400">
              Warte auf erste Frage...
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            {msg}
          </motion.div>
        ))}

        {isLoading && !isCompleting && <TypingIndicator />}
      </div>

      {/* Input Form - disabled nach 5 Antworten */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-3 opacity-100 disabled:opacity-50"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            userAnswerCount >= MAX_DIALOG_ANSWERS
              ? "Dialog abgeschlossen ✓"
              : "Deine Antwort..."
          }
          disabled={
            isLoading || userAnswerCount >= MAX_DIALOG_ANSWERS || isCompleting
          }
          className="flex-1 px-6 py-4 text-lg font-medium border-4 border-black rounded-[15px] bg-white focus:outline-none focus:ring-4 focus:ring-[#FFC667] disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <Button
          type="submit"
          disabled={
            isLoading ||
            !input.trim() ||
            userAnswerCount >= MAX_DIALOG_ANSWERS ||
            isCompleting
          }
          className="min-w-[120px]"
        >
          {isLoading ? "..." : "Senden"}
        </Button>
      </form>

      {/* Hint */}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/50">
          💡 Tipp: Sei ehrlich bei deinen Antworten - das hilft mir, die
          perfekte Lerngeschichte für dich zu erstellen!
        </p>
      </div>
    </div>
  );
}

// ============================================
// MESSAGE COMPONENTS
// ============================================

function UserMessage({ content }: { content: string }) {
  return (
    <div className="mb-4 flex justify-end">
      <div className="max-w-[80%] p-4 bg-[#00D9BE] border-4 border-black rounded-[15px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-lg font-medium text-black">{content}</p>
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mb-4">
      <div className="p-4 bg-[#FC5A46] text-white border-4 border-black rounded-[15px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-lg font-medium">⚠️ {message}</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="mb-4">
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
