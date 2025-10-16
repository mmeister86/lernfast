import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidateTag, revalidatePath } from "next/cache";

/**
 * POST /api/lesson/update-phase
 *
 * Aktualisiert die aktuelle Phase einer Lesson
 * Unterstützt: dialog, story, quiz, completed
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

    // 2. VALIDATE INPUT
    const body = await request.json();
    const { lessonId, phase } = body;

    if (!lessonId || typeof lessonId !== "string") {
      return NextResponse.json(
        { error: "Ungültige Lesson-ID." },
        { status: 400 }
      );
    }

    const validPhases = ["dialog", "story", "quiz", "completed"];
    if (!phase || !validPhases.includes(phase)) {
      return NextResponse.json(
        { error: "Ungültige Phase. Erlaubt: dialog, story, quiz, completed" },
        { status: 400 }
      );
    }

    // 3. CHECK OWNERSHIP
    const supabase = createServiceClient();

    const { data: lesson, error: fetchError } = await supabase
      .from("lesson")
      .select("user_id")
      .eq("id", lessonId)
      .single();

    if (fetchError || !lesson) {
      return NextResponse.json(
        { error: "Lesson nicht gefunden." },
        { status: 404 }
      );
    }

    if (lesson.user_id !== session.user.id) {
      return NextResponse.json(
        { error: "Keine Berechtigung für diese Lesson." },
        { status: 403 }
      );
    }

    // 4. UPDATE PHASE
    const updateData: Record<string, any> = {
      current_phase: phase,
    };

    // Wenn completed, setze completed_at
    if (phase === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("lesson")
      .update(updateData)
      .eq("id", lessonId);

    if (updateError) {
      console.error("Database error:", updateError);
      return NextResponse.json(
        { error: "Fehler beim Aktualisieren der Phase." },
        { status: 500 }
      );
    }

    // 5. INVALIDATE CACHE
    revalidateTag("lessons"); // Invalidiert Dashboard-Liste
    revalidatePath("/dashboard"); // Invalidiert Dashboard-Page
    revalidatePath(`/lesson/${lessonId}`); // Invalidiert Lesson-Page

    return NextResponse.json({
      success: true,
      message: `Phase erfolgreich auf '${phase}' gesetzt.`,
    });
  } catch (error) {
    console.error("Unexpected error in update-phase:", error);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}
