import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { LessonList } from "@/components/dashboard/lesson-list";

export default async function DashboardPage() {
  // Auth-Check
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth");
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
          <LessonList userId={session.user.id} />
        </div>
      </main>
    </>
  );
}
