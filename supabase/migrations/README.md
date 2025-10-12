# Supabase Datenbank-Migrationen

Dieses Verzeichnis enthält alle SQL-Migrationen für die lernfa.st Datenbank.

## Migrations-Historie

### 001_initial_schema.sql

- Better-Auth Basis-Tabellen: `user`, `session`, `account`, `verification`
- Initiales Setup für Authentifizierung

### 002_user_profile_fields.sql

- Zusätzliche Profil-Felder in `user` Tabelle
- `age`, `language`, `learningGoals`, `experienceLevel`, etc.
- Trigger für automatische `profileUpdatedAt` Updates

### 003_email_harmony.sql ✅

- **better-auth-harmony Plugin Integration**
- Fügt `normalizedEmail` Feld zur `user` Tabelle hinzu
- Unique Index verhindert Signup mit Email-Varianten (z.B. `foo+temp@gmail.com` vs `foo@gmail.com`)
- Blockiert über 55.000 Wegwerf-Email-Domains

## Migration ausführen

Alle Migrationen werden direkt in der Supabase SQL Console ausgeführt:

1. Öffne [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigiere zu: **SQL Editor**
3. Kopiere den Inhalt der `.sql` Datei
4. Führe die Query aus

## Was macht better-auth-harmony?

### Email-Normalisierung

```
Input:  john.doe+newsletter@gmail.com
Output: johndoe@gmail.com (in normalizedEmail gespeichert)
```

### Verhindert Missbrauch

- User kann sich nicht mehrfach mit Email-Varianten anmelden
- `johndoe@gmail.com` und `john.doe+temp@gmail.com` werden als identisch erkannt
- Blockiert Wegwerf-Domains wie `mailinator.com`, `10minutemail.com`, etc.

### Konfiguration

Siehe `lib/auth.ts`:

```typescript
emailHarmony({
  allowNormalizedSignin: true, // Login mit jeder Email-Variante erlaubt
});
```

Mit `allowNormalizedSignin: true` kann ein User, der sich mit `johndoe@gmail.com` registriert hat, sich auch mit `john.doe+anything@gmail.com` einloggen.
