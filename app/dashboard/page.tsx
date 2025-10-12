import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { LessonList } from "@/components/dashboard/lesson-list";
import { createServiceClient } from "@/lib/supabase/server";
import type { LessonWithCount } from "@/lib/lesson.types";

export default async function DashboardPage() {
  // Auth-Check
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth");
  }

  // Server-Side Data Fetching mit Service Client (umgeht RLS)
  const supabase = createServiceClient();
  
  let lessons: LessonWithCount[] = [];
  let error: string | null = null;

  try {
    const { data, error: queryError } = await supabase
      .from("lesson")
      .select(
        `
        *,
        flashcard(count)
      `
      )
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("Supabase query error:", queryError);
      error = "Fehler beim Laden der Lerneinheiten.";
    } else {
      // Transformiere Daten: Extrahiere Flashcard-Count
      lessons =
        data?.map((lesson: any) => ({
          id: lesson.id,
          user_id: lesson.user_id,
          topic: lesson.topic,
          lesson_type: lesson.lesson_type,
          status: lesson.status,
          created_at: lesson.created_at,
          completed_at: lesson.completed_at,
          flashcard_count: lesson.flashcard?.[0]?.count || 0,
        })) || [];
    }
  } catch (err) {
    console.error("Unexpected error loading lessons:", err);
    error = "Ein unerwarteter Fehler ist aufgetreten.";
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background px-4 pt-24 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-heading mb-2">
              Dein Dashboard
            </h1>
            <p className="text-lg text-foreground/70">
              Willkommen zurück, {session.user.name || session.user.email}!
            </p>
          </div>

          {/* Lessons List */}
          <LessonList lessons={lessons} error={error} />
        </div>
      </main>
    </>
  );
}
