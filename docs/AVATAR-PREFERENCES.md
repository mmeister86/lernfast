# Avatar-Präferenzen für Voice-Chat

## Übersicht

Das Avatar-Präferenz-System ermöglicht es Nutzern, einen Avatar (Lehrer-Grafik) für ihren Voice-Chat-Gesprächspartner auszuwählen. Die Präferenz wird unabhängig von der TTS-Stimme in der Datenbank gespeichert und kann in den Profil-Einstellungen geändert werden.

## Feature-Details

- **6 verfügbare Avatare:** Hanne, Lena, Mai, Naomi, Niklas, Tariq
- **Unabhängige Auswahl:** Avatar und TTS-Stimme können frei kombiniert werden
- **Persistente Speicherung:** Präferenz wird in der `user`-Tabelle gespeichert
- **UI-Integration:** Avatar-Auswahl in den Profil-Einstellungen
- **Zukünftige Integration:** Avatare werden später im Voice-Chat angezeigt

## Datenbank-Schema

### Spalte: `avatar_preference`

```sql
-- Spalte in der user-Tabelle
avatar_preference VARCHAR(20) DEFAULT 'hanne'

-- Check Constraint für Validierung
CHECK (avatar_preference IN ('hanne', 'lena', 'mai', 'naomi', 'niklas', 'tariq'))
```

**Migration:** `supabase/migrations/20251025_add_avatar_preference.sql`

## TypeScript Types

### Avatar-Konstanten

```typescript
// lib/profile.types.ts
export const AVATAR_PREFERENCES = [
  "hanne",
  "lena",
  "mai",
  "naomi",
  "niklas",
  "tariq",
] as const;

export type AvatarPreference = (typeof AVATAR_PREFERENCES)[number];

export const AVATAR_LABELS: Record<
  AvatarPreference,
  { name: string; description: string }
> = {
  hanne: { name: "Hanne", description: "Freundlich und geduldig" },
  lena: { name: "Lena", description: "Energisch und motivierend" },
  mai: { name: "Mai", description: "Kreativ und inspirierend" },
  naomi: { name: "Naomi", description: "Ruhig und analytisch" },
  niklas: { name: "Niklas", description: "Strukturiert und methodisch" },
  tariq: { name: "Tariq", description: "Dynamisch und begeisternd" },
};
```

### Zod-Validierung

```typescript
// In profileUpdateSchema
avatarPreference: z.enum(AVATAR_PREFERENCES).optional(),
```

### UserProfile Interface

```typescript
interface UserProfile {
  // ... andere Felder
  avatarPreference?: AvatarPreference; // Optional field
}
```

## UI-Komponenten

### Profil-Form Avatar-Sektion

**Datei:** `components/dashboard/profile-form.tsx`

**Styling:**

- Card-Header: `bg-[#00D9BE]` (Teal-Hintergrund)
- Grid-Layout: `grid-cols-2 md:grid-cols-3 gap-4`
- Avatar-Bilder: 96x96px, `rounded-[15px]`, `border-4 border-black`
- Neobrutalismus-Design mit Shadow-Effekten

**Interaktion:**

- Klickbare Avatar-Karten
- Aktiver Zustand: Teal-Hintergrund mit Shadow-Verschiebung
- Hover-Effekt: Shadow-Vergrößerung

### Avatar-Anzeige

```tsx
<img
  src={`/teachers/${avatar}.jpeg`}
  alt={AVATAR_LABELS[avatar].name}
  className="w-24 h-24 rounded-[15px] border-4 border-black object-cover"
/>
```

## API-Endpunkte

### POST /api/profile/update

**Request Body:**

```json
{
  "avatarPreference": "hanne"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "avatarPreference": "hanne"
    // ... andere Felder
  }
}
```

### GET /api/profile/update

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "avatarPreference": "hanne"
    // ... andere Felder
  }
}
```

## Supabase Queries

### getCachedUserProfile()

**Datei:** `lib/supabase/queries.ts`

```typescript
// SELECT-Statement erweitert
avatar_preference,

// Transformation
avatarPreference: data.avatar_preference,
```

**Cache:** 120 Sekunden, Tag: `'users'`

## Avatar-Dateien

**Verzeichnis:** `/public/teachers/`

**Dateien:**

- `hanne.jpeg`
- `lena.jpeg`
- `mai.jpeg`
- `naomi.jpeg`
- `niklas.jpeg`
- `tariq.jpeg`

**Spezifikationen:**

- Format: JPEG
- Empfohlene Größe: 300x300px (wird auf 96x96px skaliert)
- Quadratisches Seitenverhältnis
- Optimiert für Web-Darstellung

## Verwendung in Voice-Chat

**Hinweis:** Die Integration in den Voice-Chat erfolgt in einer späteren Phase.

**Geplante Verwendung:**

```tsx
// In voice-dialog-phase.tsx (zukünftig)
const { data: profile } = useSession();
const selectedAvatar = profile?.user?.avatarPreference || "hanne";

// Avatar-Anzeige
<img
  src={`/teachers/${selectedAvatar}.jpeg`}
  alt="Voice-Chat Partner"
  className="w-32 h-32 rounded-[15px] border-4 border-black"
/>;
```

## Beispiel-Code

### Avatar-Auswahl-Komponente

```tsx
import { AVATAR_PREFERENCES, AVATAR_LABELS } from "@/lib/profile.types";

function AvatarSelector({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {AVATAR_PREFERENCES.map((avatar) => (
        <div
          key={avatar}
          className={cn(
            "p-4 rounded-[15px] border-4 border-black cursor-pointer",
            selected === avatar
              ? "bg-[#00D9BE] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          )}
          onClick={() => onSelect(avatar)}
        >
          <img
            src={`/teachers/${avatar}.jpeg`}
            alt={AVATAR_LABELS[avatar].name}
            className="w-24 h-24 rounded-[15px] border-4 border-black object-cover"
          />
          <p className="font-extrabold text-lg mt-2">
            {AVATAR_LABELS[avatar].name}
          </p>
          <p className="text-sm font-medium text-black/70">
            {AVATAR_LABELS[avatar].description}
          </p>
        </div>
      ))}
    </div>
  );
}
```

### Avatar-Anzeige-Komponente

```tsx
function AvatarDisplay({ avatar, size = "md" }) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  return (
    <div className="flex flex-col items-center">
      <img
        src={`/teachers/${avatar}.jpeg`}
        alt={AVATAR_LABELS[avatar].name}
        className={cn(
          "rounded-[15px] border-4 border-black object-cover",
          sizeClasses[size]
        )}
      />
      <p className="font-extrabold text-lg mt-2">
        {AVATAR_LABELS[avatar].name}
      </p>
    </div>
  );
}
```

## Technische Details

### Validierung

1. **Client-seitig:** Zod-Schema in `profileUpdateSchema`
2. **Server-seitig:** PostgreSQL Check Constraint
3. **API:** Validierung in `/api/profile/update`

### Caching

- **Cache-Tag:** `'users'`
- **Invalidierung:** Nach Profil-Update via `revalidateTag('users')`
- **Cache-Dauer:** 120 Sekunden für User-Profile

### Styling

- **Design-System:** Neobrutalismus
- **Border-Radius:** `rounded-[15px]` (15px)
- **Borders:** `border-4 border-black`
- **Shadows:** `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- **Farben:** Teal (`#00D9BE`) für Avatar-Sektion

### Performance

- **Lazy Loading:** Avatar-Bilder werden bei Bedarf geladen
- **Optimierung:** JPEG-Format für kleine Dateigröße
- **Caching:** Browser-Cache für Avatar-Bilder

## Migration

Die Migration ist idempotent und kann mehrfach ausgeführt werden:

```bash
# Migration ausführen
supabase db push

# Oder direkt in Supabase Dashboard
# SQL aus 20251025_add_avatar_preference.sql ausführen
```

## Testing

### Unit Tests

```typescript
// Avatar-Types testen
expect(AVATAR_PREFERENCES).toContain("hanne");
expect(AVATAR_LABELS.hanne.name).toBe("Hanne");

// Zod-Validierung testen
const validData = { avatarPreference: "hanne" };
expect(profileUpdateSchema.safeParse(validData).success).toBe(true);
```

### Integration Tests

```typescript
// API-Endpunkt testen
const response = await fetch("/api/profile/update", {
  method: "POST",
  body: JSON.stringify({ avatarPreference: "lena" }),
});
expect(response.ok).toBe(true);
```

## Troubleshooting

### Häufige Probleme

1. **Avatar-Bild wird nicht angezeigt:**

   - Prüfe, ob Datei in `/public/teachers/` existiert
   - Prüfe Dateiname (muss exakt `{avatar}.jpeg` sein)

2. **Validierung schlägt fehl:**

   - Prüfe, ob `avatarPreference` in `AVATAR_PREFERENCES` enthalten ist
   - Prüfe PostgreSQL Check Constraint

3. **Cache-Problem:**
   - Führe `revalidateTag('users')` aus
   - Warte 120 Sekunden für Cache-Expiry

### Debug-Logging

```typescript
// In ProfileForm
console.log("Current avatar preference:", formData.avatarPreference);
console.log("Available avatars:", AVATAR_PREFERENCES);
```

## Changelog

### v1.0.0 (2025-01-25)

- Initiale Implementierung der Avatar-Präferenzen
- 6 Avatar-Optionen verfügbar
- UI-Integration in Profil-Einstellungen
- Datenbank-Migration und API-Support
- TypeScript-Types und Zod-Validierung
