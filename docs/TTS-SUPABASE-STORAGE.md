# TTS Audio Storage mit Supabase Storage

**Erstellungsdatum:** 2025-10-18
**Status:** Langfristige Lösung (Phase 2)
**Voraussetzung:** Supabase Storage (Cloud oder Self-Hosted)

---

## Übersicht

Diese Anleitung beschreibt die Migration von **On-Demand TTS-Generierung** zu **proaktiver Audio-Generierung mit Supabase Storage**.

### Warum Supabase Storage?

**Aktuelles Problem (MVP):**
- Audio wird on-demand generiert (jedes Mal beim Abspielen)
- Hohe Latenz (~2-3s pro Kapitel)
- Redundante OpenAI API-Kosten
- Next.js Cache-Limit (2MB) verhindert Base64-Storage in DB

**Lösung mit Supabase Storage:**
- ✅ Audio wird **einmal** generiert beim Story-Creation
- ✅ Gespeichert als `.mp3` Dateien in Supabase Storage Bucket
- ✅ Instant Playback via CDN-URL
- ✅ 99% Kosteneinsparung bei wiederholtem Abspielen
- ✅ Self-Hosted = ultraschneller Upload (gleicher Server)

---

## Architektur

### Current Flow (MVP - On-Demand Generation)

```
User klickt Play-Button
    ↓
TTSPlayer ruft generateSpeechAudio() auf
    ↓
OpenAI TTS API generiert MP3 (~700KB)
    ↓
Base64-Encoding
    ↓
Audio spielt ab (Latenz: ~2-3s)
```

### Target Flow (Phase 2 - Proactive Storage)

```
Story-Generierung abgeschlossen
    ↓
Parallel: Generiere Audio für alle Kapitel
    ↓
Upload zu Supabase Storage (/tts-audio/{lessonId}/{chapterIndex}.mp3)
    ↓
Speichere Public URL in DB (flashcard.learning_content.story.audioUrl)
    ↓
---
User klickt Play-Button
    ↓
TTSPlayer lädt MP3 von CDN-URL
    ↓
Audio spielt sofort ab (Latenz: ~200ms)
```

---

## Implementierung

### Schritt 1: Supabase Storage Bucket erstellen

**Via Supabase Dashboard:**

1. Gehe zu **Storage** → **Create Bucket**
2. Name: `tts-audio`
3. **Public Bucket:** ✅ (für CDN-URLs)
4. **File Size Limit:** 10MB (ausreichend für TTS)
5. Erstelle Bucket

**Via SQL (Alternative):**

```sql
-- Bucket erstellen
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-audio', 'tts-audio', true);

-- RLS Policies (Public Read, Authenticated Write)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'tts-audio');

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tts-audio'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tts-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Schritt 2: Server Action für Storage-Upload

**Neue Datei:** `app/lesson/[id]/actions/actions-tts-storage.tsx`

```typescript
"use server";

import { createServiceClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VOICE_MAP: Record<string, string> = {
  de: "onyx",
  en: "nova",
  es: "alloy",
  fr: "fable",
  it: "shimmer",
};

/**
 * Generiert Audio und speichert es in Supabase Storage
 * @returns Public URL zur MP3-Datei
 */
export async function generateAndStoreAudio(
  text: string,
  language: string,
  lessonId: string,
  chapterIndex: number
): Promise<{ audioUrl: string }> {
  const voice = VOICE_MAP[language] || "onyx";

  // 1. Generiere Audio via OpenAI
  const mp3Response = await openaiClient.audio.speech.create({
    model: "tts-1",
    voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
    input: text,
  });

  const arrayBuffer = await mp3Response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 2. Upload zu Supabase Storage
  const supabase = createServiceClient();
  const fileName = `${lessonId}/${chapterIndex}.mp3`;

  const { data, error } = await supabase.storage
    .from("tts-audio")
    .upload(fileName, buffer, {
      contentType: "audio/mpeg",
      upsert: true, // Überschreibe falls bereits vorhanden
    });

  if (error) {
    console.error("❌ Supabase Storage upload failed:", error);
    throw new Error("Audio konnte nicht gespeichert werden");
  }

  // 3. Generiere Public URL
  const { data: publicUrlData } = supabase.storage
    .from("tts-audio")
    .getPublicUrl(fileName);

  console.log(`✅ Audio uploaded: ${publicUrlData.publicUrl}`);
  return { audioUrl: publicUrlData.publicUrl };
}

/**
 * Generiert Audio für alle Story-Kapitel (parallel)
 */
export async function generateChapterAudios(
  chapters: Array<{ narrative: string; keyLearnings: string[] }>,
  lessonId: string,
  language: string = "de"
): Promise<string[]> {
  const audioPromises = chapters.map(async (chapter, index) => {
    const chapterText = `${chapter.narrative}\n\nDas Wichtigste:\n${chapter.keyLearnings.join("\n")}`;
    const { audioUrl } = await generateAndStoreAudio(chapterText, language, lessonId, index);
    return audioUrl;
  });

  const audioUrls = await Promise.all(audioPromises);
  console.log(`✅ Generated ${audioUrls.length} chapter audios`);
  return audioUrls;
}
```

### Schritt 3: Integration in Story-Generierung

**Datei:** `app/lesson/[id]/actions/actions-story-phase.tsx`

```typescript
import { generateChapterAudios } from "./actions-tts-storage";

export async function generateStory(
  lessonId: string,
  userId: string,
  topic: string,
  knowledgeLevel: string,
  lessonType: "micro_dose" | "deep_dive"
): Promise<ReactNode> {
  // ... Story-Generierung wie bisher ...

  console.log(`✅ Story object generated with ${story.chapters.length} chapters.`);

  // ✅ NEU: Proaktive Audio-Generierung mit Supabase Storage
  const audioUrls = await generateChapterAudios(story.chapters, lessonId, "de");

  const chaptersToInsert = story.chapters.map((chapter, index) => {
    // ... Validierung wie bisher ...

    return {
      lesson_id: lessonId,
      question: chapter.chapterTitle,
      phase: "story",
      order_index: index,
      learning_content: {
        story: {
          chapterTitle: chapter.chapterTitle,
          narrative: chapter.narrative,
          keyPoints: chapter.keyLearnings,
          visualizations: [
            {
              type: chapter.visualizationType,
              title: chapter.visualizationData.title,
              chartData: validatedChartData,
            },
          ],
          audioUrl: audioUrls[index], // ✅ Public CDN-URL statt Base64
        },
      },
    };
  });

  // ... Rest der Funktion wie bisher ...
}
```

### Schritt 4: TTSPlayer Update (keine Änderung nötig!)

Der `TTSPlayer` unterstützt bereits `preGeneratedAudioUrl`:

```typescript
// components/learning/tts-player.tsx
export function TTSPlayer({ preGeneratedAudioUrl, ... }: TTSPlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(preGeneratedAudioUrl || null);

  // Falls preGeneratedAudioUrl vorhanden → sofort abspielen
  // Falls nicht → on-demand generieren (Fallback)
}
```

**Wichtig:** Bei Supabase Storage-URLs ist kein Fallback mehr nötig, da Audio immer vorhanden ist.

---

## Performance-Vergleich

### MVP (On-Demand Generation)

| Aktion | Latenz | Kosten (pro Play) |
|--------|--------|-------------------|
| User klickt Play | ~2-3s | $0.000015 (1000 Zeichen × $15/1M) |
| 100x abspielen | ~250s | $0.0015 |

### Phase 2 (Supabase Storage)

| Aktion | Latenz | Kosten (pro Play) |
|--------|--------|-------------------|
| Story-Generierung (einmalig) | +3s | $0.000045 (3 Kapitel) |
| User klickt Play | ~200ms | $0 (CDN-Caching) |
| 100x abspielen | ~20s | $0 (nur Bandwidth) |

**Kosteneinsparung:** 99% bei wiederholtem Abspielen
**Latenz-Verbesserung:** 93% (2.5s → 0.2s)

---

## Self-Hosted Supabase Optimierung

**Wenn Supabase auf dem gleichen Server wie lernfa.st läuft:**

### Vorteile:

- ✅ **Ultraschneller Upload:** Interne Netzwerkverbindung (1-10 Gbit/s statt 100 Mbit/s Internet)
- ✅ **Keine Bandwidth-Kosten:** Kein Traffic zum Cloud-Provider
- ✅ **Niedrige Latenz:** <5ms statt ~50ms (Cloud)
- ✅ **Volle Kontrolle:** Keine Storage-Limits, keine Rate-Limits

### Konfiguration:

**In `.env.local`:**

```bash
# Self-Hosted Supabase (internes Netzwerk)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000  # Lokaler Supabase-Server
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Für Produktion: Nginx Reverse Proxy
NEXT_PUBLIC_SUPABASE_URL=https://supabase.lernfa.st
```

**Nginx Reverse Proxy (Empfohlen für Produktion):**

```nginx
# /etc/nginx/sites-available/supabase.lernfa.st
server {
    listen 443 ssl http2;
    server_name supabase.lernfa.st;

    ssl_certificate /etc/letsencrypt/live/supabase.lernfa.st/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/supabase.lernfa.st/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Performance-Test:**

```bash
# Upload-Speed testen (sollte <100ms sein bei Self-Hosted)
time curl -X POST \
  http://localhost:8000/storage/v1/object/tts-audio/test.mp3 \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  --data-binary @test.mp3
```

---

## Migration von MVP zu Phase 2

### Option 1: Hard Migration (Breaking Change)

**Vorgehensweise:**

1. Deploy neuer Code mit Supabase Storage
2. Alle alten Lessons haben **keine** `audioUrl` → Fallback zu on-demand
3. Neue Lessons haben immer `audioUrl` → instant playback
4. Optional: Batch-Job für alte Lessons (Audio nachgenerieren)

**Vorteil:** Einfach, keine Daten-Migration nötig

### Option 2: Soft Migration (Backward Compatible)

**Vorgehensweise:**

1. TTSPlayer prüft: `preGeneratedAudioUrl` vorhanden? → Nutze CDN
2. Falls nicht: `generateSpeechAudio()` (on-demand wie bisher)
3. Alte Lessons funktionieren weiterhin (mit höherer Latenz)
4. Neue Lessons nutzen Storage (mit niedriger Latenz)

**Vorteil:** Keine Breaking Changes, schrittweise Adoption

**Code (bereits implementiert!):**

```typescript
// components/learning/tts-player.tsx
const [audioUrl, setAudioUrl] = useState<string | null>(preGeneratedAudioUrl || null);

useEffect(() => {
  if (!audioUrl && !isLoading && !isPlaying) {
    // Fallback: On-Demand Generation
    generateAudio();
  }
}, [audioUrl, isLoading, isPlaying]);
```

---

## Kosten-Kalkulation (Produktion)

### Annahmen:

- **100 Lessons/Tag** generiert
- **Durchschnitt 4 Kapitel** pro Lesson
- **1000 Zeichen/Kapitel** (Text + Key Learnings)
- **1 Lesson wird 10x** abgespielt (im Schnitt)

### MVP (On-Demand Generation):

| Kostenpunkt | Berechnung | Kosten/Monat |
|-------------|-----------|--------------|
| Story-Generierung | 100 × 4 × 10 × $0.000015 | $0.60 |
| Dialog-Generierung | 100 × 2 × 10 × $0.000015 | $0.30 |
| **Total** | | **$0.90/Monat** |

### Phase 2 (Supabase Storage):

| Kostenpunkt | Berechnung | Kosten/Monat |
|-------------|-----------|--------------|
| Initiale Generierung | 100 × 4 × $0.000015 × 30 | $0.18 |
| Storage (700KB × 400 Kapitel/Monat) | 280 MB × $0.021/GB | $0.006 |
| Bandwidth (Self-Hosted) | $0 (internes Netzwerk) | $0 |
| **Total** | | **$0.19/Monat** |

**Einsparung:** $0.71/Monat (79% günstiger)

---

## Troubleshooting

### Problem 1: Upload schlägt fehl

**Symptom:** `Error: Audio konnte nicht gespeichert werden`

**Lösungen:**

1. **RLS Policy prüfen:**
```sql
SELECT * FROM storage.policies WHERE bucket_id = 'tts-audio';
```

2. **Service Role Key prüfen:**
```bash
echo $SUPABASE_SERVICE_ROLE_KEY
```

3. **Bucket Public-Status prüfen:**
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'tts-audio';
```

### Problem 2: Audio lädt langsam

**Symptom:** CDN-URL braucht >1s zum Laden

**Lösungen:**

1. **CDN-Caching aktivieren:**
```nginx
location ~* \.mp3$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

2. **Supabase Edge Network nutzen:**
```typescript
// In Production: Supabase CDN automatisch aktiv
const { data } = supabase.storage.from('tts-audio').getPublicUrl(fileName);
// URL Format: https://PROJECT_ID.supabase.co/storage/v1/object/public/tts-audio/...
```

3. **Self-Hosted:** Nginx Gzip aktivieren
```nginx
gzip on;
gzip_types audio/mpeg;
```

### Problem 3: Doppelte Generierung

**Symptom:** Audio wird mehrmals generiert für gleiche Story

**Lösung:** `upsert: true` beim Upload nutzen (bereits implementiert)

```typescript
await supabase.storage.from("tts-audio").upload(fileName, buffer, {
  upsert: true, // Überschreibt falls bereits vorhanden
});
```

---

## Rollout-Plan

### Phase 2.1: Setup (1-2 Tage)

- [ ] Supabase Storage Bucket `tts-audio` erstellen
- [ ] RLS Policies konfigurieren
- [ ] `actions-tts-storage.tsx` implementieren
- [ ] Unit-Tests für Upload-Funktion

### Phase 2.2: Integration (2-3 Tage)

- [ ] `generateStory()` Update mit `generateChapterAudios()`
- [ ] Testing mit Self-Hosted Supabase (Upload-Speed messen)
- [ ] Monitoring: Supabase Storage Dashboard

### Phase 2.3: Testing & Deployment (1-2 Tage)

- [ ] Staging-Deployment mit neuer Story-Generierung
- [ ] Performance-Tests (Latenz, Upload-Dauer)
- [ ] Production-Deployment mit Canary-Rollout (10% Traffic)
- [ ] Monitoring: OpenAI Kosten vs. Supabase Bandwidth

### Phase 2.4: Cleanup (Optional)

- [ ] Alte Lessons migrieren (Batch-Job)
- [ ] On-Demand Fallback entfernen (wenn 100% Migration erreicht)
- [ ] Analytics: Durchschnittliche Plays/Lesson tracken

---

## Weitere Optimierungen (Phase 3)

### 1. User-Language Support

**Aktuell:** Hardcoded `language="de"` in `generateChapterAudios()`

**Verbesserung:**

```typescript
// In generateStory()
const userProfile = await getCachedUserProfile(userId);
const userLanguage = userProfile?.language || "de";

const audioUrls = await generateChapterAudios(
  story.chapters,
  lessonId,
  userLanguage // ✅ Dynamisch
);
```

### 2. Audio-Kompression

**Aktuell:** TTS-1 generiert ~700KB/Kapitel

**Verbesserung:** FFmpeg-Kompression (optional)

```typescript
import ffmpeg from "fluent-ffmpeg";

async function compressAudio(inputBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    ffmpeg(inputBuffer)
      .audioCodec("libmp3lame")
      .audioBitrate("64k") // Reduziert Größe um ~50%
      .format("mp3")
      .on("end", () => resolve(Buffer.concat(chunks)))
      .on("error", reject)
      .pipe()
      .on("data", (chunk) => chunks.push(chunk));
  });
}
```

**Einsparung:** ~350KB/Kapitel → 50% weniger Storage & Bandwidth

### 3. CDN-Warming

**Problem:** Erstes Abspielen braucht ~500ms (Cold Start)

**Lösung:** Prefetch nach Story-Generierung

```typescript
// Nach Upload: Prefetch alle Audio-URLs
const prefetchPromises = audioUrls.map((url) =>
  fetch(url, { method: "HEAD" })
);
await Promise.all(prefetchPromises);
```

### 4. Multi-Voice Support

**Aktuell:** Eine Voice pro Sprache

**Verbesserung:** User-Präferenz im Profil

```typescript
// lib/profile.types.ts
export interface UserProfile {
  ttsVoice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
}

// In generateChapterAudios()
const voice = userProfile?.ttsVoice || VOICE_MAP[language];
```

---

## Zusammenfassung

**Status Quo (MVP):**
- ✅ On-Demand TTS funktioniert
- ❌ Hohe Latenz (~2-3s)
- ❌ Redundante API-Kosten

**Nach Migration (Phase 2):**
- ✅ Instant Playback (~200ms)
- ✅ 79% Kostenreduktion
- ✅ Skalierbar für 1000+ Lessons

**Self-Hosted Bonus:**
- ✅ Ultraschneller Upload (<100ms)
- ✅ Keine Bandwidth-Kosten
- ✅ Volle Kontrolle

**Nächste Schritte:**
1. Supabase Storage Bucket `tts-audio` erstellen
2. `actions-tts-storage.tsx` implementieren
3. Testing mit einer Test-Lesson
4. Deployment + Monitoring
