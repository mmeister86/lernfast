"use client";

import { TopicSuggestion } from "@/lib/lesson.types";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface TopicSelectionModalProps {
  isOpen: boolean;
  suggestions: TopicSuggestion[];
  onSelect: (suggestion: TopicSuggestion) => void;
  onClose: () => void;
}

export function TopicSelectionModal({
  isOpen,
  suggestions,
  onSelect,
  onClose,
}: TopicSelectionModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = (suggestion: TopicSuggestion) => {
    setSelectedId(suggestion.id);
    // Kurze Verzögerung für visuelles Feedback
    setTimeout(() => {
      onSelect(suggestion);
      setSelectedId(null);
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl bg-white border-4 border-black rounded-[15px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        {/* Header */}
        <div className="bg-[#FFC667] border-b-4 border-black p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-extrabold text-black">
              Wähle ein Thema
            </h2>
            <button
              onClick={onClose}
              className="text-black hover:scale-110 transition-transform duration-100 text-2xl font-extrabold"
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>
          <p className="text-base font-medium text-black/80 mt-2">
            Wähle einen Aspekt, der dich besonders interessiert
          </p>

          {/* Subtile 3-Phasen-Info */}
          <div className="mt-3 flex items-left gap-2 justify-start text-sm font-medium text-black/60">
            <span>💬 Dialog</span>
            <span>→</span>
            <span>📖 Story</span>
            <span>→</span>
            <span>🎯 Quiz</span>
          </div>
        </div>

        {/* Suggestions Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {suggestions.map((suggestion) => {
            const isSelected = selectedId === suggestion.id;

            return (
              <button
                key={suggestion.id}
                onClick={() => handleSelect(suggestion)}
                className={cn(
                  "group relative text-left p-6 border-4 border-black rounded-[15px] transition-all duration-100",
                  isSelected
                    ? "bg-[#FFC667] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[2px] translate-y-[2px]"
                    : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]]"
                )}
              >
                {/* Badge für Lesson Type */}
                <div className="absolute top-3 right-3 bg-[#FFC667] text-black px-3 py-1 rounded-[15px] text-xs font-extrabold border-2 border-black">
                  ⚡ 3-5 Kapitel
                </div>

                {/* Emoji Header */}
                <div className="text-5xl mb-4">{suggestion.emoji}</div>

                {/* Title */}
                <h3 className="text-xl font-extrabold text-black mb-2 line-clamp-2">
                  {suggestion.title}
                </h3>

                {/* Description */}
                <p className="text-sm font-medium text-black/70 line-clamp-3">
                  {suggestion.description}
                </p>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-black text-white px-3 py-1 rounded-[15px] text-xs font-extrabold">
                    ✓ Gewählt
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t-4 border-black bg-gray-50 p-4 text-center">
          <p className="text-sm font-medium text-black/60">
            Nach der Auswahl startest du mit dem interaktiven Dialog 💬
          </p>
        </div>
      </div>
    </div>
  );
}
