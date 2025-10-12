"use client";

import { useState } from "react";
import { LessonCard } from "./lesson-card";
import { Button } from "@/components/ui/button";
import type { LessonWithCount } from "@/lib/lesson.types";

type LessonListProps = {
  lessons: LessonWithCount[];
  error: string | null;
};

export function LessonList({
  lessons: initialLessons,
  error,
}: LessonListProps) {
  const [lessons, setLessons] = useState<LessonWithCount[]>(initialLessons);
  const [filter, setFilter] = useState<"all" | "completed" | "processing">(
    "all"
  );

  /**
   * Löscht eine Lesson mit optimistic update
   */
  const handleDelete = async (lessonId: string) => {
    // Backup für Rollback bei Fehler
    const backup = [...lessons];

    // Optimistic Update: Entferne Lesson sofort aus UI
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));

    try {
      const res = await fetch("/api/lesson/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Löschen fehlgeschlagen");
      }
    } catch (error) {
      // Rollback bei Fehler
      console.error("Delete failed:", error);
      setLessons(backup);
      alert(
        error instanceof Error
          ? error.message
          : "Fehler beim Löschen. Bitte versuche es erneut."
      );
    }
  };

  const filteredLessons = lessons.filter((lesson) => {
    if (filter === "all") return true;
    if (filter === "completed") return lesson.status === "completed";
    if (filter === "processing")
      return lesson.status === "processing" || lesson.status === "pending";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Error State */}
      {error && (
        <div className="p-6 border-4 border-[#FC5A46] bg-red-50 rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-lg font-extrabold text-black mb-2">⚠️ Fehler</p>
          <p className="text-base font-medium text-black/80">{error}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-3 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "neutral"}
          onClick={() => setFilter("all")}
        >
          Alle ({lessons.length})
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "neutral"}
          onClick={() => setFilter("completed")}
        >
          Abgeschlossen (
          {lessons.filter((l) => l.status === "completed").length})
        </Button>
        <Button
          variant={filter === "processing" ? "default" : "neutral"}
          onClick={() => setFilter("processing")}
        >
          In Bearbeitung (
          {
            lessons.filter(
              (l) => l.status === "processing" || l.status === "pending"
            ).length
          }
          )
        </Button>
      </div>

      {/* Content */}
      {filteredLessons.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 border-4 border-dashed border-black rounded-[15px] bg-white">
          <p className="text-xl font-extrabold mb-2">Keine Lessons gefunden</p>
          <p className="text-base font-medium text-foreground/70">
            {filter === "all"
              ? "Erstelle deine erste Lesson auf der Startseite!"
              : `Keine ${
                  filter === "completed" ? "abgeschlossenen" : "aktiven"
                } Lessons vorhanden.`}
          </p>
        </div>
      ) : (
        /* Lessons Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
