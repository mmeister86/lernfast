import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getCachedLesson } from "@/lib/supabase/queries";
import { Navbar } from "@/components/navbar";
import { FlashcardViewer } from "@/components/flashcard/flashcard-viewer";
import type { LessonWithFlashcards } from "@/lib/lesson.types";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Lesson Viewer Page
 * Zeigt eine einzelne Lesson mit allen zugehörigen Flashcards
 *
 * - Auth-Check: Nur eingeloggte User
 * - Ownership-Check: Nur eigene Lessons (in getCachedLesson)
 * - 404 bei nicht existierender Lesson
 * - Cache: 300 Sekunden (5 Minuten) - Flashcards sind unveränderlich
 */
export default async function LessonPage({ params }: PageProps) {
  // Auth Check
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth");
  }

  // Params auflösen (Next.js 15 Promise-basiert)
  const { id } = await params;

  // Load Lesson + Flashcards mit gecachtem Query (5min Cache)
  const { data: lesson, error } = await getCachedLesson(id, session.user.id);

  // 404 wenn Lesson nicht existiert
  if (error || !lesson) {
    notFound();
  }

  // Ownership Check wird bereits in getCachedLesson durchgeführt
  const lessonWithFlashcards = lesson as LessonWithFlashcards;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background px-4 pt-24 pb-8">
        <div className="max-w-7xl mx-auto">
          <FlashcardViewer
            lesson={lessonWithFlashcards}
            flashcards={lessonWithFlashcards.flashcard}
          />
        </div>
      </main>
    </>
  );
}
