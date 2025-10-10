import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("🔄 Verbinde mit Datenbank...");

    const schema = readFileSync(
      join(__dirname, "..", "lib", "db-schema.sql"),
      "utf-8"
    );

    console.log("📝 Führe Schema-Migration aus...");
    await pool.query(schema);

    console.log("✅ Migration erfolgreich abgeschlossen!");

    // Prüfe, ob Tabellen erstellt wurden
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('user', 'session', 'account', 'verification')
      ORDER BY table_name;
    `);

    console.log("\n📊 Erstellte Tabellen:");
    result.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error("❌ Fehler bei der Migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
