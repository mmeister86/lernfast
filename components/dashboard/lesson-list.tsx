"use client";

import { useState } from "react";
import { LessonCard } from "./lesson-card";
import { Button } from "@/components/ui/button";

// Mock-Daten für Lessons
const MOCK_LESSONS = [
  {
    id: "1",
    topic: "Quantum Computing Basics",
    lessonType: "micro_dose" as const,
    status: "completed" as const,
    createdAt: new Date("2025-10-08T10:30:00"),
    completedAt: new Date("2025-10-08T10:45:00"),
    flashcardCount: 5,
  },
  {
    id: "2",
    topic: "React Server Components",
    lessonType: "deep_dive" as const,
    status: "completed" as const,
    createdAt: new Date("2025-10-09T14:20:00"),
    completedAt: new Date("2025-10-09T14:50:00"),
    flashcardCount: 12,
  },
  {
    id: "3",
    topic: "TypeScript Advanced Types",
    lessonType: "micro_dose" as const,
    status: "processing" as const,
    createdAt: new Date("2025-10-10T09:15:00"),
    completedAt: null,
    flashcardCount: 0,
  },
  {
    id: "4",
    topic: "Next.js App Router Deep Dive",
    lessonType: "deep_dive" as const,
    status: "pending" as const,
    createdAt: new Date("2025-10-10T11:00:00"),
    completedAt: null,
    flashcardCount: 0,
  },
];

type LessonListProps = {
  userId: string;
};

export function LessonList({ userId }: LessonListProps) {
  const [filter, setFilter] = useState<"all" | "completed" | "processing">(
    "all"
  );

  // TODO: Später durch echte Supabase-Query ersetzen
  const lessons = MOCK_LESSONS;

  const filteredLessons = lessons.filter((lesson) => {
    if (filter === "all") return true;
    if (filter === "completed") return lesson.status === "completed";
    if (filter === "processing")
      return lesson.status === "processing" || lesson.status === "pending";
    return true;
  });

  return (
    <div className="space-y-6">
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

      {/* Lessons Grid */}
      {filteredLessons.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-base">
          <p className="text-xl font-heading mb-2">Keine Lessons gefunden</p>
          <p className="text-foreground/70">
            {filter === "all"
              ? "Erstelle deine erste Lesson auf der Startseite!"
              : `Keine ${filter === "completed" ? "abgeschlossenen" : "aktiven"} Lessons vorhanden.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      )}
    </div>
  );
}
