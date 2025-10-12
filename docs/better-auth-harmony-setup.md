# Better Auth Harmony - Setup & Testing Guide

## ✅ Installation abgeschlossen

Das `better-auth-harmony` Plugin ist jetzt vollständig in lernfa.st integriert!

## Was wurde installiert?

### 1. Package Installation

```bash
pnpm add better-auth-harmony
```

### 2. Plugin-Integration (`lib/auth.ts`)

```typescript
import { emailHarmony } from "better-auth-harmony";

plugins: [
  emailHarmony({
    allowNormalizedSignin: true, // Login mit jeder Email-Variante erlaubt
  }),
  magicLink({ ... }),
]
```

### 3. Next.js ESM-Konfiguration (`next.config.ts`)

```typescript
const nextConfig: NextConfig = {
  transpilePackages: ["better-auth-harmony"],
};
```

### 4. Datenbank-Migration (Supabase)

```sql
-- supabase/migrations/003_email_harmony.sql
ALTER TABLE "user" ADD COLUMN "normalizedEmail" TEXT;
CREATE UNIQUE INDEX idx_user_normalized_email ON "user" ("normalizedEmail");
```

## Funktionalität

### Email-Normalisierung

Das Plugin normalisiert automatisch alle Email-Adressen:

| Original Email                  | Normalisierte Email | Ergebnis                              |
| ------------------------------- | ------------------- | ------------------------------------- |
| `john.doe+newsletter@gmail.com` | `johndoe@gmail.com` | ✅ Gespeichert als `normalizedEmail`  |
| `John.Doe@GoogleMail.com`       | `johndoe@gmail.com` | ✅ Identisch erkannt                  |
| `user+temp@gmail.com`           | `user@gmail.com`    | ✅ Verhindert mehrfache Registrierung |

### Wegwerf-Email-Blockierung

Über **55.000 Wegwerf-Email-Domains** werden automatisch blockiert:

- ❌ `test@mailinator.com` → Registrierung verweigert
- ❌ `user@10minutemail.com` → Registrierung verweigert
- ❌ `fake@guerrillamail.com` → Registrierung verweigert
- ✅ `user@gmail.com` → Erlaubt
- ✅ `user@proton.me` → Erlaubt

### Flexible Login-Optionen

Mit `allowNormalizedSignin: true` können User sich mit **jeder Variante** ihrer Email einloggen:

**Registrierung mit:** `johndoe@gmail.com`

**Login möglich mit:**

- ✅ `johndoe@gmail.com` (Original)
- ✅ `john.doe@gmail.com` (mit Punkt)
- ✅ `johndoe+anything@gmail.com` (mit Plus-Alias)
- ✅ `JohnDoe@GoogleMail.com` (Case-insensitive + Domain-Alias)

## Testing

### 1. Lokalen Dev-Server starten

```bash
pnpm dev
```

### 2. Test-Szenarien

#### ✅ Normalisierung testen

1. Gehe zu `http://localhost:3000/auth`
2. Registriere dich mit: `test+unique123@gmail.com`
3. Öffne Supabase Dashboard → Table Editor → `user`
4. **Erwartung:**
   - `email`: `test+unique123@gmail.com`
   - `normalizedEmail`: `test@gmail.com`

#### ✅ Mehrfach-Registrierung verhindern

1. Registriere User: `john@gmail.com`
2. Versuche erneut: `john+temp@gmail.com`
3. **Erwartung:** Fehler - Email bereits registriert

#### ✅ Wegwerf-Domain blockieren

1. Versuche Registrierung: `test@mailinator.com`
2. **Erwartung:** Fehler - Wegwerf-Email nicht erlaubt

#### ✅ Flexibler Login

1. Registriere User: `johndoe@gmail.com`
2. Logge dich ein mit: `john.doe+newsletter@gmail.com`
3. **Erwartung:** Login erfolgreich (gleicher User)

### 3. Datenbank überprüfen

```sql
-- In Supabase SQL Editor
SELECT email, "normalizedEmail" FROM "user" LIMIT 10;
```

## Konfigurationsoptionen

### Standard-Konfiguration (aktuell aktiv)

```typescript
emailHarmony({
  allowNormalizedSignin: true,
});
```

### Erweiterte Optionen

```typescript
emailHarmony({
  // Login nur mit exakter Email erlauben
  allowNormalizedSignin: false, // Default: false

  // Custom Validator (optional)
  validator: async (email: string) => {
    // Eigene Validierungslogik
    return isValid;
  },

  // Custom Normalizer (optional)
  normalizer: async (email: string) => {
    // Eigene Normalisierungslogik
    return normalizedEmail;
  },
});
```

## Troubleshooting

### Problem: ESM Module Error

**Symptom:** `Cannot find module` oder `Cannot use import statement`

**Lösung 1 (Next.js):**

```typescript
// next.config.ts
transpilePackages: ["better-auth-harmony"];
```

**Lösung 2 (Node >= 22):**
Kein Fix nötig, funktioniert out-of-the-box.

**Lösung 3 (Node >= 20.10):**

```bash
NODE_OPTIONS=--experimental-detect-module pnpm dev
```

### Problem: Datenbank-Fehler "column normalizedEmail does not exist"

**Lösung:** Migration erneut ausführen in Supabase SQL Editor:

```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "normalizedEmail" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_normalized_email
ON "user" ("normalizedEmail") WHERE "normalizedEmail" IS NOT NULL;
```

### Problem: User kann sich nicht einloggen

**Diagnose:**

1. Prüfe `allowNormalizedSignin` Setting
2. Checke Supabase: Hat User ein `normalizedEmail` Feld?
3. Alte User (vor Migration) haben evtl. kein `normalizedEmail`

**Lösung:** Alte User manuell migrieren:

```sql
UPDATE "user"
SET "normalizedEmail" = LOWER(TRIM(email))
WHERE "normalizedEmail" IS NULL;
```

## Weiterführende Dokumentation

- **Better Auth Harmony GitHub:** https://github.com/gekorm/better-auth-harmony
- **Better Auth Docs:** https://better-auth.com
- **Supabase Docs:** https://supabase.com/docs

## Nächste Schritte

✅ Plugin installiert und konfiguriert
✅ Datenbank-Migration ausgeführt
⏭️ Testing im Auth-Flow durchführen
⏭️ Phase 1 MVP fortsetzen: n8n KI-Pipeline aufbauen
