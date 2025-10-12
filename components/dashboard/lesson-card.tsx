"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import type {
  LessonStatus,
  LessonType,
  LessonWithCount,
} from "@/lib/lesson.types";

type LessonCardProps = {
  lesson: LessonWithCount;
  onDelete?: (lessonId: string) => Promise<void>;
};

const STATUS_CONFIG = {
  pending: {
    label: "Wartend",
    color: "bg-yellow-200 text-yellow-900 border-yellow-900",
    icon: "⏳",
  },
  processing: {
    label: "In Bearbeitung",
    color: "bg-blue-200 text-blue-900 border-blue-900",
    icon: "⚡",
  },
  completed: {
    label: "Abgeschlossen",
    color: "bg-green-200 text-green-900 border-green-900",
    icon: "✓",
  },
  failed: {
    label: "Fehlgeschlagen",
    color: "bg-red-200 text-red-900 border-red-900",
    icon: "✗",
  },
};

const TYPE_CONFIG = {
  micro_dose: {
    label: "Micro Dose",
    color: "bg-purple-100 text-purple-900 border-purple-900",
  },
  deep_dive: {
    label: "Deep Dive",
    color: "bg-orange-100 text-orange-900 border-orange-900",
  },
};

export function LessonCard({ lesson, onDelete }: LessonCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const statusConfig = STATUS_CONFIG[lesson.status];
  const typeConfig = TYPE_CONFIG[lesson.lesson_type];

  const timeAgo = formatDistanceToNow(new Date(lesson.created_at), {
    addSuffix: true,
    locale: de,
  });

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(lesson.id);
      // Nach erfolgreichem Löschen bleibt isDeleting true,
      // da die Komponente aus dem DOM entfernt wird
    } catch (error) {
      console.error("Delete failed:", error);
      setIsDeleting(false);
    }
  };

  return (
    <Card className="hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer">
      <CardHeader>
        <div className="flex gap-2 mb-3">
          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-[15px] border-2 text-xs font-heading ${statusConfig.color}`}
          >
            <span>{statusConfig.icon}</span>
            {statusConfig.label}
          </span>

          {/* Type Badge */}
          <span
            className={`inline-flex items-center px-3 py-1 rounded-[15px] border-2 text-xs font-heading ${typeConfig.color}`}
          >
            {typeConfig.label}
          </span>
        </div>

        <CardTitle className="text-2xl line-clamp-2">{lesson.topic}</CardTitle>
        <CardDescription className="text-foreground/60">
          Erstellt {timeAgo}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {lesson.status === "completed" && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-heading text-main text-lg">
              {lesson.flashcard_count}
            </span>
            <span className="text-foreground/70">
              {lesson.flashcard_count === 1 ? "Flashcard" : "Flashcards"}
            </span>
          </div>
        )}

        {(lesson.status === "processing" || lesson.status === "pending") && (
          <div className="flex items-center gap-2">
            <div className="animate-pulse h-2 w-full bg-main/20 rounded-full overflow-hidden">
              <div className="h-full bg-main w-1/3 animate-pulse"></div>
            </div>
          </div>
        )}

        {lesson.status === "failed" && (
          <p className="text-sm text-red-700">
            Die Erstellung ist fehlgeschlagen. Bitte versuche es erneut.
          </p>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {lesson.status === "completed" ? (
          <Link href={`/lesson/${lesson.id}`} className="flex-1">
            <Button className="w-full">Flashcards ansehen</Button>
          </Link>
        ) : lesson.status === "failed" ? (
          <Button variant="neutral" className="w-full" disabled>
            Erneut versuchen
          </Button>
        ) : (
          <Button variant="neutral" className="w-full" disabled>
            Wird erstellt...
          </Button>
        )}

        {/* Delete Button mit AlertDialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="coral"
              size="icon"
              disabled={isDeleting}
              className="shrink-0"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Lerninhalt löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Diese Aktion kann nicht rückgängig gemacht werden. Alle
                Flashcards dieser Lerneinheit werden ebenfalls gelöscht.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Wird gelöscht..." : "Löschen"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
