import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * DELETE Lesson API Route
 *
 * Löscht eine Lerneinheit und alle zugehörigen Flashcards (CASCADE DELETE).
 * Nur der Owner der Lesson kann diese löschen.
 *
 * @param request - Request mit lessonId im Body
 * @returns JSON Response mit success oder error
 */
export async function POST(request: Request) {
  try {
    // 1. Session validieren
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert. Bitte melde dich an." },
        { status: 401 }
      );
    }

    // 2. Request-Body parsen
    const { lessonId } = await request.json();
    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId ist erforderlich." },
        { status: 400 }
      );
    }

    // 3. Lesson abfragen & Ownership prüfen
    const supabase = createServiceClient();
    const { data: lesson, error: fetchError } = await supabase
      .from("lesson")
      .select("user_id")
      .eq("id", lessonId)
      .single();

    if (fetchError || !lesson) {
      console.error("Lesson not found:", fetchError);
      return NextResponse.json(
        { error: "Lerneinheit nicht gefunden." },
        { status: 404 }
      );
    }

    if (lesson.user_id !== session.user.id) {
      console.warn(
        `User ${session.user.id} attempted to delete lesson ${lessonId} owned by ${lesson.user_id}`
      );
      return NextResponse.json(
        { error: "Du hast keine Berechtigung, diese Lerneinheit zu löschen." },
        { status: 403 }
      );
    }

    // 4. Lesson löschen (CASCADE DELETE löscht automatisch Flashcards)
    const { error: deleteError } = await supabase
      .from("lesson")
      .delete()
      .eq("id", lessonId);

    if (deleteError) {
      console.error("Delete failed:", deleteError);
      return NextResponse.json(
        { error: "Löschen fehlgeschlagen. Bitte versuche es erneut." },
        { status: 500 }
      );
    }

    console.log(
      `Lesson ${lessonId} successfully deleted by user ${session.user.id}`
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in delete route:", error);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}
