import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { LessonList } from "@/components/dashboard/lesson-list";
import { getCachedLessons } from "@/lib/supabase/queries";
import type { LessonWithCount } from "@/lib/lesson.types";

export default async function DashboardPage() {
  // Auth-Check
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth");
  }

  // Server-Side Data Fetching mit gecachten Queries (60s Cache)
  let lessons: LessonWithCount[] = [];
  let error: string | null = null;

  try {
    const { data, error: queryError } = await getCachedLessons(session.user.id);

    if (queryError) {
      console.error("getCachedLessons error:", queryError);
      error = "Fehler beim Laden der Lerneinheiten.";
    } else {
      lessons = data || [];
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
