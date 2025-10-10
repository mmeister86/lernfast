import { NextResponse } from "next/server";

/**
 * DEBUG-Route zum Prüfen der Umgebungsvariablen in Production
 * WICHTIG: Nach dem Debugging LÖSCHEN oder nur in Development erlauben!
 */
export async function GET() {
  // TEMPORÄR FÜR DEBUGGING - DANACH WIEDER AKTIVIEREN!
  // const isDevelopment = process.env.NODE_ENV === "development";
  // if (!isDevelopment) {
  //   return NextResponse.json(
  //     { error: "Debug endpoint nur in Development verfügbar" },
  //     { status: 403 }
  //   );
  // }

  const envCheck = {
    // Database
    DATABASE_URL: process.env.DATABASE_URL
      ? `✅ Gesetzt (${process.env.DATABASE_URL.substring(0, 30)}...)`
      : "❌ FEHLT",

    // Better-Auth
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET
      ? `✅ Gesetzt (Länge: ${process.env.BETTER_AUTH_SECRET.length} Zeichen)`
      : "❌ FEHLT",
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "❌ FEHLT",
    NEXT_PUBLIC_BETTER_AUTH_URL:
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "❌ FEHLT",

    // Resend
    RESEND_API_KEY: process.env.RESEND_API_KEY
      ? `✅ Gesetzt (${process.env.RESEND_API_KEY.substring(0, 10)}...)`
      : "❌ FEHLT",

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || "❌ FEHLT",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? "✅ Gesetzt"
      : "❌ FEHLT",

    // Node Environment
    NODE_ENV: process.env.NODE_ENV,
  };

  // Test Datenbankverbindung
  let dbConnectionTest = "Nicht getestet";
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      await pool.query("SELECT 1");
      await pool.end();
      dbConnectionTest = "✅ Verbindung erfolgreich";
    } catch (error) {
      dbConnectionTest = `❌ Fehler: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }

  // Test Better-Auth Tabellen
  let tableCheck = "Nicht getestet";
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('user', 'session', 'account', 'verification')
      `);
      const tables = result.rows.map((row) => row.table_name);
      await pool.end();

      const requiredTables = ["user", "session", "account", "verification"];
      const missingTables = requiredTables.filter((t) => !tables.includes(t));

      if (missingTables.length === 0) {
        tableCheck = `✅ Alle Better-Auth Tabellen vorhanden: ${tables.join(", ")}`;
      } else {
        tableCheck = `❌ Fehlende Tabellen: ${missingTables.join(", ")} (Vorhandene: ${tables.join(", ")})`;
      }
    } catch (error) {
      tableCheck = `❌ Fehler: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: envCheck,
    databaseConnection: dbConnectionTest,
    databaseTables: tableCheck,
  });
}
