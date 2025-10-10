import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/trigger-lesson
 *
 * Erstellt eine neue Lesson in der Datenbank und triggert den n8n-Workflow
 * zur KI-generierten Lernkarten-Erstellung.
 *
 * SICHERHEIT:
 * - Prüft Better-Auth Session (serverseitig)
 * - Validiert Input
 * - Rate Limiting (später mit Upstash)
 * - Premium-Check für Deep Dive (später mit Stripe)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. AUTH CHECK: Ist User eingeloggt?
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht autorisiert. Bitte melde dich an." },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 2. INPUT VALIDIERUNG
    const body = await request.json()
    const { topic, lessonType } = body

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json(
        { error: "Bitte gib ein gültiges Thema ein." },
        { status: 400 }
      )
    }

    if (!lessonType || !["micro_dose", "deep_dive"].includes(lessonType)) {
      return NextResponse.json(
        { error: "Ungültiger Lesson-Typ." },
        { status: 400 }
      )
    }

    // TODO: Premium-Check für Deep Dive
    // if (lessonType === "deep_dive" && !session.user.isPremium) {
    //   return NextResponse.json(
    //     { error: "Deep Dive ist nur für Premium-Nutzer verfügbar." },
    //     { status: 403 }
    //   )
    // }

    // TODO: Rate Limiting mit Upstash
    // const rateLimitResult = await checkRateLimit(userId)
    // if (!rateLimitResult.success) {
    //   return NextResponse.json(
    //     { error: "Zu viele Anfragen. Bitte warte ein paar Minuten." },
    //     { status: 429 }
    //   )
    // }

    // 3. DATENBANK: Erstelle Lesson-Eintrag in Supabase
    const supabase = await createClient()

    const { data: lesson, error: dbError } = await supabase
      .from("lesson")
      .insert({
        user_id: userId,
        topic: topic.trim(),
        lesson_type: lessonType,
        status: "pending", // Wird zu 'processing' wenn n8n startet
      })
      .select()
      .single()

    if (dbError || !lesson) {
      console.error("Database error:", dbError)
      return NextResponse.json(
        { error: "Fehler beim Erstellen der Lerneinheit." },
        { status: 500 }
      )
    }

    // 4. N8N WEBHOOK TRIGGER (wenn N8N_WEBHOOK_URL gesetzt ist)
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL

    if (n8nWebhookUrl) {
      try {
        // Trigger n8n Workflow asynchron (Fire & Forget oder mit Callback)
        await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lessonId: lesson.id,
            topic: lesson.topic,
            lessonType: lesson.lesson_type,
            userId: userId,
          }),
        })

        // Update Lesson-Status zu 'processing'
        await supabase
          .from("lesson")
          .update({ status: "processing" })
          .eq("id", lesson.id)

      } catch (n8nError) {
        console.error("n8n webhook error:", n8nError)
        // Setze Status auf 'failed'
        await supabase
          .from("lesson")
          .update({ status: "failed" })
          .eq("id", lesson.id)

        return NextResponse.json(
          { error: "Fehler bei der KI-Generierung. Bitte versuche es erneut." },
          { status: 500 }
        )
      }
    } else {
      // Fallback: Wenn n8n nicht konfiguriert ist (Development)
      console.warn("N8N_WEBHOOK_URL nicht gesetzt - Lesson erstellt aber ohne KI-Generierung")

      // Erstelle Dummy-Flashcards für Development
      await supabase.from("flashcard").insert([
        {
          lesson_id: lesson.id,
          question: `Was ist ${topic}?`,
          thesys_json: { type: "text", content: "Platzhalter - n8n nicht konfiguriert" },
        },
        {
          lesson_id: lesson.id,
          question: `Wie funktioniert ${topic}?`,
          thesys_json: { type: "text", content: "Platzhalter - n8n nicht konfiguriert" },
        },
      ])

      // Setze Status auf 'completed'
      await supabase
        .from("lesson")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", lesson.id)
    }

    // 5. ERFOLGREICHE RESPONSE
    return NextResponse.json(
      {
        success: true,
        lessonId: lesson.id,
        status: n8nWebhookUrl ? "processing" : "completed",
        message: n8nWebhookUrl
          ? "Deine Lernkarten werden generiert..."
          : "Lernkarten erstellt (Development-Modus)",
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Unexpected error in trigger-lesson:", error)
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 }
    )
  }
}
