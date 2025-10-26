/**
 * Voice Dialog Types & Constants
 * Shared types for Voice Dialog Phase components and hooks
 */

export interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
  text: string;
  audioUrl?: string;
  timestamp: string;
}

export interface VoiceDialogResult {
  userTranscript: string;
  aiResponse: string;
  aiAudioUrl: string;
  shouldAssess: boolean;
}

export interface VoiceAssessmentResult {
  summary: string;
  audioUrl: string;
  knowledgeLevel: "beginner" | "intermediate" | "advanced";
  confidence: number;
  reasoning: string;
}

export interface VoiceDialogPhaseProps {
  lessonId: string;
  userId: string;
  topic: string;
}

export const MAX_DIALOG_ANSWERS = 5;
