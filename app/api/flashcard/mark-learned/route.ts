import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/flashcard/mark-learned
 *
 * Markiert eine Flashcard als gelernt/ungelernt
 *
 * Input: { flashcardId: string, isLearned: boolean }
 * Output: { success: true, flashcardId: string, isLearned: boolean }
 *
 * SICHERHEIT:
 * - Auth-Check: Nur eingeloggte User
 * - Ownership-Check: User muss Owner der zugehörigen Lesson sein
 */
export async function POST(request: NextRequest) {
  try {
    // 1. AUTH CHECK
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht autorisiert. Bitte melde dich an." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. INPUT VALIDIERUNG
    const body = await request.json();
    const { flashcardId, isLearned } = body;

    if (!flashcardId || typeof flashcardId !== "string") {
      return NextResponse.json(
        { error: "Ungültige Flashcard-ID." },
        { status: 400 }
      );
    }

    if (typeof isLearned !== "boolean") {
      return NextResponse.json(
        { error: "isLearned muss ein Boolean sein." },
        { status: 400 }
      );
    }

    // 3. OWNERSHIP CHECK
    const supabase = createServiceClient();

    // Prüfe: Gehört die Flashcard zu einer Lesson des Users?
    const { data: flashcard, error: fetchError } = await supabase
      .from("flashcard")
      .select(
        `
        id,
        lesson:lesson_id (
          user_id
        )
      `
      )
      .eq("id", flashcardId)
      .single();

    if (fetchError || !flashcard) {
      return NextResponse.json(
        { error: "Flashcard nicht gefunden." },
        { status: 404 }
      );
    }

    // Type-Assertion für nested relation
    const flashcardWithLesson = flashcard as unknown as {
      id: string;
      lesson: { user_id: string };
    };

    if (flashcardWithLesson.lesson.user_id !== userId) {
      return NextResponse.json(
        { error: "Du darfst diese Flashcard nicht bearbeiten." },
        { status: 403 }
      );
    }

    // 4. UPDATE FLASHCARD
    const { error: updateError } = await supabase
      .from("flashcard")
      .update({ is_learned: isLearned })
      .eq("id", flashcardId);

    if (updateError) {
      console.error("Flashcard update error:", updateError);
      return NextResponse.json(
        { error: "Fehler beim Aktualisieren der Flashcard." },
        { status: 500 }
      );
    }

    // 5. SUCCESS RESPONSE
    return NextResponse.json(
      {
        success: true,
        flashcardId,
        isLearned,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in mark-learned:", error);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}

