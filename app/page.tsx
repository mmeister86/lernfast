"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { FeaturesSection } from "@/components/landing/features-section";
import { Footer } from "@/components/landing/footer";
import { GradientBackground } from "@/components/landing/gradient-background";
import { LoadingModal } from "@/components/loading-modal";
import { TopicSelectionModal } from "@/components/landing/topic-selection-modal";
import { useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { cn } from "@/lib/utils";
import { TopicSuggestion } from "@/lib/lesson.types";

type LoadingPhase =
  | "suggesting"
  | "analyzing"
  | "researching"
  | "preparing";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const [topic, setTopic] = useState("");
  const [lessonType, setLessonType] = useState<"micro_dose" | "deep_dive">(
    "micro_dose"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase | null>(null);
  const [error, setError] = useState<string | null>(null);

  // NEU: Topic-Suggestion Workflow State
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [selectedRefinedTopic, setSelectedRefinedTopic] = useState<
    string | null
  >(null);

  // Track verarbeitete Topics um doppelte API-Calls zu verhindern
  const processedTopics = useRef<Set<string>>(new Set());

  // Verarbeite Topic aus URL-Parameter (nach Login-Redirect)
  useEffect(() => {
    const urlTopic = searchParams.get("topic");
    if (urlTopic && session?.user && !isLoading && !isPending) {
      // Prüfe, ob Topic bereits verarbeitet wurde
      if (processedTopics.current.has(urlTopic)) {
        return; // Skip doppelte Verarbeitung
      }

      processedTopics.current.add(urlTopic);
      setTopic(urlTopic);
      // Statt sofort zu generieren: erst Vorschläge laden und Modal öffnen
      fetchTopicSuggestions(urlTopic).finally(() => {
        // URL-Parameter entfernen, um Re-Trigger zu vermeiden
        const url = new URL(window.location.href);
        url.searchParams.delete("topic");
        window.history.replaceState({}, "", url.pathname);
      });
    }
  }, [searchParams, session, isLoading, isPending]);

  // NEU: Topic-Suggestions laden
  const fetchTopicSuggestions = async (topicValue: string) => {
    setIsLoading(true);
    setLoadingPhase("suggesting");
    setError(null);

    try {
      const response = await fetch("/api/suggest-topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topicValue.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Fehler beim Laden der Vorschläge. Bitte versuche es erneut."
        );
        setIsLoading(false);
        setLoadingPhase(null);
        return;
      }

      // Suggestions anzeigen
      setSuggestions(data.suggestions);
      setShowTopicModal(true);
      setIsLoading(false);
      setLoadingPhase(null);
    } catch (err) {
      console.error("Topic suggestion error:", err);
      setError("Ein unerwarteter Fehler ist aufgetreten.");
      setIsLoading(false);
      setLoadingPhase(null);
    }
  };

  // NEU: Lesson erstellen mit refinedTopic
  const handleTopicSubmit = async (
    topicValue: string,
    refinedTopic?: string
  ) => {
    if (!session?.user || !topicValue.trim() || isLoading) return;

    setIsLoading(true);
    setLoadingPhase("analyzing");

    try {
      // Phase 1: Analysiere (kurze Verzögerung für bessere UX)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Phase 2: Recherche
      setLoadingPhase("researching");

      const response = await fetch("/api/trigger-lesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topicValue.trim(),
          refinedTopic: refinedTopic || null,
          lessonType: lessonType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Ein Fehler ist aufgetreten. Bitte versuche es erneut."
        );
        setIsLoading(false);
        setLoadingPhase(null);
        return;
      }

      // Phase 3: Bereite Dialog vor
      setLoadingPhase("preparing");
      await new Promise((resolve) => setTimeout(resolve, 800));

      // URL-Parameter clearen (verhindert Re-Trigger beim Zurück-Navigieren)
      const url = new URL(window.location.href);
      url.searchParams.delete("topic");
      window.history.replaceState({}, "", url.pathname);

      // Erfolg → Weiterleitung zum Lesson-View (Dialog-Phase startet SOFORT!)
      router.push(`/lesson/${data.lessonId}`);
    } catch (err) {
      console.error("Lesson creation error:", err);
      setError("Ein unerwarteter Fehler ist aufgetreten.");
      setIsLoading(false);
      setLoadingPhase(null);
    }
  };

  // NEU: Handler für Topic-Auswahl aus Modal
  const handleTopicSelection = (suggestion: TopicSuggestion) => {
    setShowTopicModal(false);
    setSelectedRefinedTopic(suggestion.title);
    // Starte Lesson-Erstellung mit refinedTopic
    handleTopicSubmit(topic, suggestion.title);
  };

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

    // User ist eingeloggt → Lade Topic-Suggestions
    await fetchTopicSuggestions(topic);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        {/* Gradient Background */}
        <GradientBackground />

        <div className="text-center w-full max-w-3xl relative z-10">
          <h1 className="text-6xl md:text-7xl font-heading mb-4">lernfast</h1>
          <p className="text-xl md:text-2xl text-foreground/70 mb-12">
            What do you want to learn today?
          </p>

          {error && (
            <div className="mb-6 p-4 border-2 border-red-500 bg-red-50 rounded-base">
              <p className="text-sm text-red-700 font-base">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Lesson Type Selection */}
            <div className="mb-8 flex gap-4 justify-center">
              <button
                type="button"
                onClick={() => setLessonType("micro_dose")}
                className={cn(
                  "px-6 py-3 border-4 border-black rounded-[15px] font-extrabold transition-all",
                  lessonType === "micro_dose"
                    ? "bg-[#FFC667] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                )}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span>⚡ Micro-Dose</span>
                  </div>
                  <p className="text-xs font-medium mt-1">
                    3-5 Karten • Kostenlos
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLessonType("deep_dive")}
                disabled={true}
                className="px-6 py-3 border-4 border-black rounded-[15px] font-extrabold bg-gray-100 opacity-50 cursor-not-allowed"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span>🚀 Deep Dive</span>
                    <span className="text-xs bg-[#662CB7] text-white px-2 py-0.5 rounded-[15px]">
                      Bald
                    </span>
                  </div>
                  <p className="text-xs font-medium mt-1">
                    10-15 Karten • Premium
                  </p>
                </div>
              </button>
            </div>
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

      {/* Feature Section - nur für nicht-eingeloggte User */}
      {!session?.user && !isPending && <FeaturesSection />}

      {/* Footer - nur für nicht-eingeloggte User */}
      {!session?.user && !isPending && <Footer />}

      {/* Loading Modal mit Hamster */}
      <LoadingModal
        isOpen={loadingPhase !== null}
        phase={loadingPhase || "analyzing"}
      />

      {/* Topic Selection Modal */}
      <TopicSelectionModal
        isOpen={showTopicModal}
        suggestions={suggestions}
        onSelect={handleTopicSelection}
        onClose={() => {
          setShowTopicModal(false);
          setSuggestions([]);
        }}
      />
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
                lernfast
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
