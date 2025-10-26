/**
 * API Route: POST /api/profile/update
 * Aktualisiert das User-Profil (age, language, learningGoals, etc.)
 */

import { auth } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/profile.types";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    // 1. Auth-Check: User muss eingeloggt sein
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    // 2. Request Body parsen
    const body = await request.json();

    // 3. Validation mit Zod Schema
    const validationResult = profileUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validierungsfehler",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 4. SQL Query bauen (nur Felder updaten, die im Request vorhanden sind)
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.age !== undefined) {
      updates.push(`age = $${paramIndex++}`);
      values.push(data.age);
    }

    if (data.language !== undefined) {
      updates.push(`language = $${paramIndex++}`);
      values.push(data.language);
    }

    if (data.learningGoals !== undefined) {
      updates.push(`learning_goals = $${paramIndex++}`);
      values.push(data.learningGoals);
    }

    if (data.experienceLevel !== undefined) {
      updates.push(`experience_level = $${paramIndex++}`);
      values.push(data.experienceLevel);
    }

    if (data.preferredDifficulty !== undefined) {
      updates.push(`preferred_difficulty = $${paramIndex++}`);
      values.push(data.preferredDifficulty);
    }

    if (data.preferredCardCount !== undefined) {
      updates.push(`preferred_card_count = $${paramIndex++}`);
      values.push(data.preferredCardCount);
    }

    if (data.ttsVoice !== undefined) {
      updates.push(`tts_voice = $${paramIndex++}`);
      values.push(data.ttsVoice);
    }

    if (data.avatarPreference !== undefined) {
      updates.push(`avatar_preference = $${paramIndex++}`);
      values.push(data.avatarPreference);
    }

    // Name Update (direkt in Better Auth user table)
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    // Onboarding als completed markieren wenn alle kritischen Felder gesetzt
    if (
      data.age &&
      data.language &&
      data.learningGoals &&
      data.experienceLevel
    ) {
      updates.push(`onboarding_completed = true`);
    }

    // Falls nichts zu updaten ist
    if (updates.length === 0) {
      return NextResponse.json(
        { error: "Keine Felder zum Updaten vorhanden" },
        { status: 400 }
      );
    }

    // updatedAt wird automatisch gesetzt
    updates.push(`"updatedAt" = NOW()`);

    // 5. Query ausführen
    values.push(session.user.id); // User ID als letzter Parameter

    const query = `
      UPDATE "user"
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING
        id, email, name, image, "emailVerified",
        age, language, learning_goals as "learningGoals",
        experience_level as "experienceLevel",
        preferred_difficulty as "preferredDifficulty",
        preferred_card_count as "preferredCardCount",
        onboarding_completed as "onboardingCompleted",
        profile_updated_at as "profileUpdatedAt",
        tts_voice as "ttsVoice",
        avatar_preference as "avatarPreference",
        "createdAt", "updatedAt"
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "User nicht gefunden" },
        { status: 404 }
      );
    }

    const updatedUser = result.rows[0];

    // 6. Session neu laden (Better-Auth)
    // Session muss neu geladen werden, da user-Tabelle direkt geändert wurde
    await auth.api.getSession({
      headers: await headers(),
      query: {
        disableCookieCache: true, // Force refresh from database
      },
    });

    // 7. Cache invalidieren
    revalidateTag("users"); // User-Profile Cache
    revalidateTag("lessons"); // Falls Lessons User-Daten enthalten
    revalidatePath("/dashboard/profile"); // Profil-Page
    revalidatePath("/lesson/[id]", "page"); // Alle Lesson-Pages (für Avatar-Display)

    // 8. Erfolgreiche Response
    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Profil erfolgreich aktualisiert",
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      {
        error: "Interner Serverfehler",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profile/update
 * Gibt das aktuelle User-Profil zurück
 */
export async function GET() {
  try {
    // Auth-Check
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    // User-Daten aus DB holen (mit allen Profilfeldern)
    const result = await pool.query(
      `
      SELECT
        id, email, name, image, "emailVerified",
        age, language, learning_goals as "learningGoals",
        experience_level as "experienceLevel",
        preferred_difficulty as "preferredDifficulty",
        preferred_card_count as "preferredCardCount",
        onboarding_completed as "onboardingCompleted",
        profile_updated_at as "profileUpdatedAt",
        tts_voice as "ttsVoice",
        avatar_preference as "avatarPreference",
        "createdAt", "updatedAt"
      FROM "user"
      WHERE id = $1
    `,
      [session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "User nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
