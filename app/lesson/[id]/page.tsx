import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
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
 * - Ownership-Check: Nur eigene Lessons
 * - 404 bei nicht existierender Lesson
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

  // Load Lesson + Flashcards aus Supabase
  const supabase = createServiceClient();

  const { data: lesson, error } = await supabase
    .from("lesson")
    .select(
      `
      *,
      flashcard(*)
    `
    )
    .eq("id", id)
    .single();

  // 404 wenn Lesson nicht existiert
  if (error || !lesson) {
    notFound();
  }

  // Ownership Check: Nur eigene Lessons anzeigen
  if (lesson.user_id !== session.user.id) {
    redirect("/dashboard");
  }

  // Type-Assertion für TypeScript
  const lessonWithFlashcards = lesson as unknown as LessonWithFlashcards;

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

