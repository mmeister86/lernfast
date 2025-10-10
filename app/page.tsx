"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verarbeite Topic aus URL-Parameter (nach Login-Redirect)
  useEffect(() => {
    const urlTopic = searchParams.get("topic");
    if (urlTopic && session?.user && !isLoading) {
      setTopic(urlTopic);
      // Triggere automatisch die Lesson-Erstellung
      const form = document.querySelector("form") as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }
  }, [searchParams, session, isLoading]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validierung
    if (!topic.trim()) {
      setError("Bitte gib ein Thema ein.");
      return;
    }

    // Wenn nicht eingeloggt → Redirect zu /auth
    if (!session?.user) {
      // Speichere das Thema in sessionStorage für später
      sessionStorage.setItem("pendingTopic", topic);
      router.push("/auth");
      return;
    }

    // User ist eingeloggt → Starte KI-Flow
    setIsLoading(true);

    try {
      const response = await fetch("/api/trigger-lesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
          lessonType: "micro_dose", // Default: Micro-Dose für alle User
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Ein Fehler ist aufgetreten. Bitte versuche es erneut."
        );
        setIsLoading(false);
        return;
      }

      // Erfolg → Weiterleitung zum Dashboard oder Lesson-View
      router.push(`/lesson/${data.lessonId}`);
    } catch (err) {
      console.error("Lesson creation error:", err);
      setError("Ein unerwarteter Fehler ist aufgetreten.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center w-full max-w-3xl">
          <h1 className="text-6xl md:text-7xl font-heading mb-4">lernfa.st</h1>
          <p className="text-xl md:text-2xl text-foreground/70 mb-12">
            What do you want to learn today?
          </p>

          {error && (
            <div className="mb-6 p-4 border-2 border-red-500 bg-red-50 rounded-base">
              <p className="text-sm text-red-700 font-base">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Gib hier das Thema ein, das dich interessiert..."
              className="h-14 text-lg shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isLoading || isPending}
              autoFocus
            />
            <Button
              type="submit"
              size="lg"
              disabled={isLoading || isPending || !topic.trim()}
              className="w-full md:w-auto"
            >
              {isLoading ? "Wird erstellt..." : "Los geht's!"}
            </Button>
          </form>

          {!session?.user && !isPending && (
            <p className="mt-6 text-sm text-foreground/60">
              Du wirst zur Anmeldung weitergeleitet, wenn du noch kein Konto
              hast.
            </p>
          )}
        </div>
      </main>
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <>
          <Navbar />
          <main className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="text-center w-full max-w-3xl">
              <h1 className="text-6xl md:text-7xl font-heading mb-4">
                lernfa.st
              </h1>
              <p className="text-xl md:text-2xl text-foreground/70 mb-12">
                What do you want to learn today?
              </p>
              <div className="animate-pulse">Lädt...</div>
            </div>
          </main>
        </>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
