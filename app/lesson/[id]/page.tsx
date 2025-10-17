import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getCachedLesson } from "@/lib/supabase/queries";
import { createServiceClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { FlashcardViewer } from "@/components/flashcard/flashcard-viewer";
import { DialogPhase } from "@/components/learning/dialog-phase";
import { StoryGeneratorWrapper } from "@/components/learning/story-generator-wrapper";
import { QuizPhase } from "@/components/learning/quiz-phase";
import { LearningProgress } from "@/components/learning/learning-progress";
import { CompletionScreen } from "@/components/learning/completion-screen";
import type {
  LessonWithFlashcards,
  LearningPhase,
  StoryChapter,
  QuizQuestion,
} from "@/lib/lesson.types";
import type { LessonScore } from "@/lib/score.types";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Lesson Viewer Page - HYBRID VERSION
 *
 * Unterstützt beide Systeme:
 * 1. NEUES Interactive Learning: Dialog → Story → Quiz (mit current_phase)
 * 2. ALTES Flashcard-System: Klassische Flashcard-Viewer (Fallback)
 *
 * - Auth-Check: Nur eingeloggte User
 * - Ownership-Check: Nur eigene Lessons (in getCachedLesson)
 * - 404 bei nicht existierender Lesson
 * - Cache: 300 Sekunden (5 Minuten)
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

  const lessonWithFlashcards = lesson as LessonWithFlashcards;

  // Prüfe ob NEUES Interactive Learning System oder ALTES Flashcard-System
  const isInteractiveLearning = !!lessonWithFlashcards.current_phase;

  // ALTES SYSTEM: Fallback auf klassische Flashcards
  if (!isInteractiveLearning) {
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

  // NEUES SYSTEM: Interactive Learning
  const currentPhase = lessonWithFlashcards.current_phase as LearningPhase;

  // Lade Score für Completion Screen
  let score: LessonScore | null = null;
  if (currentPhase === "completed") {
    const supabase = createServiceClient();
    const { data: scoreData } = await supabase
      .from("lesson_score")
      .select("*")
      .eq("lesson_id", id)
      .eq("user_id", session.user.id)
      .single();
    score = scoreData;
  }

  // Extrahiere Story-Chapters aus Flashcards (phase='story')
  const storyChapters: StoryChapter[] = lessonWithFlashcards.flashcard
    .filter((card) => card.phase === "story")
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    .map((card) => {
      const storyContent = card.learning_content?.story;
      return {
        title: storyContent?.chapterTitle || card.question,
        narrative: storyContent?.narrative || "",
        keyLearnings: storyContent?.keyPoints || [],
        visualizationType:
          storyContent?.visualizations?.[0]?.type || "timeline",
        visualizationData: {
          title: storyContent?.visualizations?.[0]?.title || "",
          chartData: storyContent?.visualizations?.[0]?.chartData || [],
        },
      };
    });

  // Debug-Logging für Story-Chapters
  console.log("=== STORY CHAPTERS DEBUG ===");
  console.log("Total chapters:", storyChapters.length);
  storyChapters.forEach((chapter, i) => {
    console.log(`📖 Chapter ${i + 1}:`, {
      title: chapter.title,
      hasVisualization: !!chapter.visualizationData,
      chartDataLength: chapter.visualizationData?.chartData?.length || 0,
      visualizationType: chapter.visualizationType,
      visualizationTitle: chapter.visualizationData?.title,
      chartData: chapter.visualizationData?.chartData,
    });
  });
  console.log("===================");

  // Extrahiere Quiz-Questions aus Flashcards (phase='quiz')
  const quizQuestions: QuizQuestion[] = lessonWithFlashcards.flashcard
    .filter((card) => card.phase === "quiz")
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    .map((card) => {
      const quizContent = card.learning_content?.quiz;
      return {
        question: quizContent?.question || card.question,
        options: quizContent?.options || [],
        correctAnswer: quizContent?.correctAnswer || 0,
        difficulty: quizContent?.difficulty || "medium",
        explanation: quizContent?.explanation || "",
      };
    });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background px-4 pt-24 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Phase Progress Indicator */}
          <LearningProgress currentPhase={currentPhase} lessonId={id} />

          {/* Dialog Phase */}
          {currentPhase === "dialog" && (
            <DialogPhase
              lessonId={id}
              userId={session.user.id}
              topic={lessonWithFlashcards.topic}
            />
          )}

          {/* Story Phase - LIVE Generation wenn keine Kapitel vorhanden */}
          {currentPhase === "story" && (
            <StoryGeneratorWrapper
              lessonId={id}
              userId={session.user.id}
              topic={lessonWithFlashcards.topic}
              lessonType={lessonWithFlashcards.lesson_type}
              initialChapters={storyChapters}
            />
          )}

          {/* Quiz Phase */}
          {currentPhase === "quiz" && (
            <QuizPhase
              questions={quizQuestions}
              lessonId={id}
              userId={session.user.id}
            />
          )}

          {/* Completion Screen */}
          {currentPhase === "completed" && (
            <CompletionScreen
              lessonId={id}
              score={score}
              topic={lessonWithFlashcards.topic}
            />
          )}
        </div>
      </main>
    </>
  );
}
