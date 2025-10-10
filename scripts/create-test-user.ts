import { Pool } from "pg";
import { randomBytes } from "crypto";

async function createTestUser() {
  const pool = new Pool({
    connectionString: "postgresql://postgres:JcD19860!001@db.awxhggqlqaaattwjoolr.supabase.co:5432/postgres",
  });

  try {
    console.log("🔄 Verbinde mit Datenbank...");

    const userId = randomBytes(16).toString("hex");
    const accountId = randomBytes(16).toString("hex");

    const name = "Matthias Meister";
    const email = "meister.matthias86@gmail.com";
    const password = "test123"; // Temporäres Passwort für Tests

    // Hash password with bcrypt (Better Auth uses bcrypt by default)
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("👤 Erstelle Benutzer...");

    // Insert user
    await pool.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [userId, name, email, true]
    );

    console.log("✅ Benutzer erstellt!");

    // Insert account (for email/password auth)
    await pool.query(
      `INSERT INTO "account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [accountId, userId, userId, "credential", hashedPassword]
    );

    console.log("🔑 Account mit Passwort erstellt!");

    console.log("\n📋 Test-Benutzer Details:");
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   Passwort: ${password}`);
    console.log(`   User ID: ${userId}`);

  } catch (error: any) {
    if (error.code === "23505") {
      console.error("❌ Benutzer existiert bereits!");
    } else {
      console.error("❌ Fehler:", error);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTestUser();
