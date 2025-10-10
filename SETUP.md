# Setup-Anleitung für lernfa.st

## Voraussetzungen

- Node.js 18+ und pnpm installiert
- Supabase-Projekt erstellt
- PostgreSQL-Zugriff (über Supabase)

## 1. Umgebungsvariablen einrichten

Kopiere die `example.env` und fülle die Werte aus:

```bash
cp example.env .env.local
```

### Erforderliche Variablen:

#### Supabase (PUBLIC - sicher für Client)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
→ Diese findest du in deinem Supabase Dashboard unter "Settings" → "API"

#### Better-Auth Database (SERVER-ONLY - GEHEIM!)
```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```
→ Das Passwort findest du in Supabase unter "Settings" → "Database" → "Connection String"

#### Better-Auth Secret (SERVER-ONLY - GEHEIM!)
```bash
BETTER_AUTH_SECRET=<generierter-32-char-string>
```
→ Generiere einen sicheren Key mit:
```bash
openssl rand -base64 32
```

#### Better-Auth URL
```bash
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```
→ In Produktion: Deine Domain (z.B. `https://lernfa.st`)

---

## 2. Dependencies installieren

```bash
pnpm install
```

---

## 3. Better-Auth Datenbank-Tabellen erstellen

Better-Auth benötigt spezielle Tabellen in deiner Supabase-Datenbank. Du hast zwei Optionen:

### Option A: Automatische Migration (Empfohlen)

1. Erstelle ein temporäres Migrations-Script:

```bash
npx better-auth migrate
```

Dies erstellt automatisch die notwendigen Tabellen:
- `user` (Benutzer)
- `session` (Sessions)
- `account` (Für OAuth - optional)
- `verification` (E-Mail-Verifizierung - optional)

### Option B: Manuelle Migration (falls automatisch nicht funktioniert)

Führe dieses SQL in deinem Supabase SQL-Editor aus:

```sql
-- User Table
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Session Table
CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Account Table (für E-Mail/Passwort Auth)
CREATE TABLE IF NOT EXISTS "account" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  password TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indices für Performance
CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session"(user_id);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account"(user_id);
```

---

## 4. Development Server starten

```bash
pnpm dev
```

Die App läuft jetzt auf: http://localhost:3000

---

## 5. Auth testen

1. Öffne http://localhost:3000/auth
2. Erstelle einen Test-Account im "Registrieren"-Tab
3. Nach erfolgreicher Registrierung wirst du automatisch eingeloggt
4. Du wirst zur Startseite weitergeleitet

---

## Sicherheits-Checkliste ✅

- ✅ **DATABASE_URL** ist NICHT in `NEXT_PUBLIC_*` und bleibt serverseitig
- ✅ **BETTER_AUTH_SECRET** ist NICHT in `NEXT_PUBLIC_*` und bleibt serverseitig
- ✅ Nur `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` sind client-seitig (designed dafür)
- ✅ Passwörter werden von Better-Auth automatisch gehasht (bcrypt)
- ✅ Sessions werden in der Datenbank verwaltet (nicht nur Cookies)
- ✅ CSRF-Schutz ist in Better-Auth integriert

---

## Troubleshooting

### "Database connection failed"
→ Prüfe deine `DATABASE_URL` - sie muss das korrekte Passwort enthalten

### "BETTER_AUTH_SECRET is required"
→ Generiere einen Secret mit `openssl rand -base64 32` und füge ihn zu `.env.local` hinzu

### "Email already exists"
→ Der User existiert bereits - versuche dich anzumelden oder nutze eine andere E-Mail

### Migration-Fehler
→ Prüfe ob du Zugriff auf die Supabase-Datenbank hast (Connection String korrekt?)
→ Führe das SQL manuell in Supabase aus (siehe Option B oben)

---

## Nächste Schritte

Nach erfolgreichem Setup:

1. **Session-Verwaltung testen**: Prüfe ob Sessions persistent sind (Browser-Reload)
2. **User-Dashboard erstellen**: Zeige eingeloggte User-Daten an
3. **Protected Routes**: Implementiere Route-Guards für geschützte Seiten
4. **Logout-Funktion**: Füge einen Logout-Button hinzu

Siehe `CLAUDE.md` für die komplette Projekt-Roadmap.
