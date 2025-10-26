"use client";

import { motion } from "framer-motion";
import { ConversationEntry } from "../types";
import { UserMessage } from "../chat-ui/user-message";
import { AIMessage } from "../chat-ui/ai-message";
import { TypingIndicator } from "../chat-ui/typing-indicator";
import { RecordingIndicator } from "../chat-ui/recording-indicator";
import { SpeakingIndicator } from "../chat-ui/speaking-indicator";

interface ConversationViewProps {
  conversationHistory: ConversationEntry[];
  isProcessing: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  isCompleting: boolean;
}

export function ConversationView({
  conversationHistory,
  isProcessing,
  isRecording,
  isSpeaking,
  isCompleting,
}: ConversationViewProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 min-h-[680px] max-h-[1020px] overflow-y-auto">
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
    </div>
  );
}
