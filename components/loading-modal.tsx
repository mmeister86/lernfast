"use client";

import React, { useState, useEffect } from "react";
import { HamsterSpinner } from "@/components/ui/hamster-spinner";
import { cn } from "@/lib/utils";

export type LoadingPhase =
  | "suggesting"
  | "analyzing"
  | "researching"
  | "preparing";

interface LoadingModalProps {
  isOpen: boolean;
  phase: LoadingPhase;
}

/**
 * Humorvolle Phase-Nachrichten für den Ladebildschirm
 */
const phaseMessages: Record<LoadingPhase, string[]> = {
  suggesting: [
    "Hamster sucht passende Themen...",
    "🐹 Hmm, welche Aspekte könnten interessant sein?",
    "Themenvielfalt wird durchforstet...",
    "Kreative Vorschläge werden entwickelt...",
    "💡 Gleich hast du eine tolle Auswahl!",
  ],
  analyzing: [
    "Das Gehirn denkt intensiv nach...",
    "🧠 Hmm, sehr interessant!",
    "Neuronale Verbindungen werden geknüpft...",
    "Wissen wird analysiert und sortiert...",
    "💭 Aha! Das wird genial!",
  ],
  researching: [
    "Hamster recherchiert fleißig...",
    "📚 Fakten werden gesammelt!",
    "Tief in der Wissensdatenbank graben...",
    "Spannende Details werden entdeckt!",
    "🔬 Qualitätsrecherche läuft!",
  ],
  preparing: [
    "Bereite deinen Dialog vor...",
    "💬 Gleich geht's los mit dem Chat!",
    "Fragen werden vorbereitet...",
    "✨ Der Dialog startet in wenigen Sekunden!",
    "🎯 Alles bereit für deine Lernreise!",
  ],
};

/**
 * LoadingModal - Blockierendes Modal mit animiertem Gehirn
 *
 * Zeigt verschiedene humorvolle Phasen während der KI-Generierung an.
 * Modal ist nicht schließbar und wechselt automatisch zwischen Texten.
 *
 * @param isOpen - Ob das Modal sichtbar ist
 * @param phase - Aktuelle Phase der Generierung
 */
export function LoadingModal({ isOpen, phase }: LoadingModalProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const messages = phaseMessages[phase];

  // Wechsle alle 5.5 Sekunden zum nächsten Text innerhalb der Phase
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 5500);

    return () => clearInterval(interval);
  }, [isOpen, messages.length]);

  // Reset Message Index bei Phase-Wechsel
  useEffect(() => {
    setCurrentMessageIndex(0);
  }, [phase]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-modal-title"
    >
      {/* Overlay - nicht klickbar */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4">
        {/* Card mit Hamster und Text */}
        <div
          className={cn(
            "bg-white rounded-[15px] border-4 border-black",
            "shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
            "p-8 md:p-12",
            "max-w-md w-full",
            "flex flex-col items-center gap-8"
          )}
        >
          {/* Gehirn Animation */}
          <div className="w-full flex justify-center">
            <HamsterSpinner />
          </div>

          {/* Phase Text */}
          <div className="text-center space-y-3">
            <h2
              id="loading-modal-title"
              className="text-2xl md:text-3xl font-extrabold text-foreground"
            >
              {getPhaseTitleEmoji(phase)}
            </h2>
            <p
              className={cn(
                "text-lg md:text-xl font-medium text-foreground/80",
                "transition-opacity duration-300",
                "h-24 flex items-center justify-center text-center px-4"
              )}
              key={currentMessageIndex}
            >
              {messages[currentMessageIndex]}
            </p>

            {/* Progress Dots */}
            <div className="flex gap-2 justify-center pt-2">
              <div
                className={cn(
                  "w-3 h-3 rounded-full border-2 border-black transition-all duration-300",
                  phase === "suggesting" ? "bg-[#FFC667]" : "bg-white"
                )}
              />
              <div
                className={cn(
                  "w-3 h-3 rounded-full border-2 border-black transition-all duration-300",
                  phase === "analyzing" ? "bg-[#FB7DA8]" : "bg-white"
                )}
              />
              <div
                className={cn(
                  "w-3 h-3 rounded-full border-2 border-black transition-all duration-300",
                  phase === "researching" ? "bg-[#662CB7]" : "bg-white"
                )}
              />
              <div
                className={cn(
                  "w-3 h-3 rounded-full border-2 border-black transition-all duration-300",
                  phase === "preparing" ? "bg-[#00D9BE]" : "bg-white"
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hilfsfunktion: Gibt Phase-spezifischen Titel zurück
 */
function getPhaseTitleEmoji(phase: LoadingPhase): string {
  switch (phase) {
    case "suggesting":
      return "💡 Suche Themen...";
    case "analyzing":
      return "🔍 Analysiere...";
    case "researching":
      return "📚 Recherchiere...";
    case "preparing":
      return "💬 Bereite Dialog vor...";
  }
}
