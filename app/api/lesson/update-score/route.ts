import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidateTag, revalidatePath } from "next/cache";

/**
 * POST /api/lesson/update-score
 *
 * Aktualisiert den Score einer Lesson für einen User
 * Unterstützt Dialog, Story und Quiz Scores
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
    const { lessonId, scoreData } = body;

    if (!lessonId || typeof lessonId !== "string") {
      return NextResponse.json(
        { error: "Ungültige Lesson-ID." },
        { status: 400 }
      );
    }

    if (!scoreData || typeof scoreData !== "object") {
      return NextResponse.json(
        { error: "Ungültige Score-Daten." },
        { status: 400 }
      );
    }

    // 3. UPSERT SCORE IN DB
    const supabase = createServiceClient();

    const { error } = await supabase.from("lesson_score").upsert(
      {
        lesson_id: lessonId,
        user_id: session.user.id,
        ...scoreData,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "lesson_id,user_id",
      }
    );

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Fehler beim Speichern des Scores." },
        { status: 500 }
      );
    }

    // 4. INVALIDATE CACHE
    revalidateTag("lessons"); // Invalidiert Dashboard-Liste
    revalidatePath("/dashboard"); // Invalidiert Dashboard-Page
    revalidatePath(`/lesson/${lessonId}`); // Invalidiert Lesson-Page

    return NextResponse.json({
      success: true,
      message: "Score erfolgreich gespeichert.",
    });
  } catch (error) {
    console.error("Unexpected error in update-score:", error);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}
