"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Flashcard as FlashcardComponent } from "./flashcard";
import type { Lesson, Flashcard } from "@/lib/lesson.types";

type FlashcardViewerProps = {
  lesson: Lesson;
  flashcards: Flashcard[];
};

/**
 * FlashcardViewer Component
 * Carousel-Navigation durch Flashcards mit Flip-Animation
 *
 * Features:
 * - Vor/Zurück-Navigation
 * - Keyboard-Support (Pfeiltasten)
 * - Fortschrittsanzeige (X von Y)
 * - Zurück zum Dashboard
 */
export function FlashcardViewer({ lesson, flashcards }: FlashcardViewerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = flashcards[currentIndex];
  const totalCards = flashcards.length;

  // Keyboard-Navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      } else if (e.key === "ArrowRight" && currentIndex < totalCards - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else if (e.key === " ") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, totalCards]);

  // Reset Flip-State bei Kartenwechsel
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  // Empty State: Keine Flashcards
  if (totalCards === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-white border-4 border-black rounded-[15px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-2xl mx-auto">
          <p className="text-3xl font-extrabold mb-4">⚠️ Keine Flashcards</p>
          <p className="text-lg font-medium text-foreground/70 mb-6">
            Diese Lesson enthält noch keine Flashcards.
          </p>
          <Button onClick={() => router.push("/dashboard")}>
            Zurück zum Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
            {lesson.topic}
          </h1>
          <p className="text-base font-medium text-foreground/70">
            {lesson.lesson_type === "micro_dose" ? "⚡ Micro-Dose" : "🚀 Deep Dive"}
          </p>
        </div>
        <Button
          variant="neutral"
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2"
        >
          ← Zurück zum Dashboard
        </Button>
      </div>

      {/* Fortschrittsanzeige */}
      <div className="bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-extrabold">
            Karte {currentIndex + 1} von {totalCards}
          </span>
          <span className="text-base font-medium text-foreground/70">
            {Math.round(((currentIndex + 1) / totalCards) * 100)}% abgeschlossen
          </span>
        </div>
        <div className="h-3 bg-gray-100 border-2 border-black rounded-[15px] overflow-hidden">
          <div
            className="h-full bg-[#FFC667] transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex justify-center">
        <FlashcardComponent
          flashcard={currentCard}
          isFlipped={isFlipped}
          onFlip={handleFlip}
        />
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <Button
          variant="neutral"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="min-w-[120px]"
        >
          ← Vorherige
        </Button>

        <Button
          onClick={handleFlip}
          className="min-w-[120px] bg-[#FB7DA8] hover:bg-[#FB7DA8]"
        >
          {isFlipped ? "Frage zeigen" : "Antwort zeigen"}
        </Button>

        <Button
          variant="neutral"
          onClick={handleNext}
          disabled={currentIndex === totalCards - 1}
          className="min-w-[120px]"
        >
          Nächste →
        </Button>
      </div>

      {/* Keyboard Hint */}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/50">
          💡 Tipp: Nutze die Pfeiltasten ← → zum Navigieren und Leertaste zum
          Umdrehen
        </p>
      </div>
    </div>
  );
}

