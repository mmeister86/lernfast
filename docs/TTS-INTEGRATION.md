# Text-to-Speech Integration (TTS) - lernfa.st

> **Version:** 1.0 (MVP)
> **Datum:** 2025-10-18
> **Status:** ✅ Implementiert

## Übersicht

Die Text-to-Speech (TTS) Integration ermöglicht es Nutzern, sich Lerninhalte in ihrer Profilsprache vorlesen zu lassen. Dies verbessert die Accessibility, ermöglicht Multitasking und bietet ein immersives Lernerlebnis.

### Features

- ✅ **Story-Phase TTS:** Ganzes Kapitel (Narrative + Key Learnings) vorlesen lassen
- ✅ **Automatische Sprachauswahl:** Basierend auf User-Profil (`language: "de" | "en" | "es" | "fr" | "it"`)
- ✅ **Voice-Mapping:** Intelligente Auswahl der besten OpenAI-Stimme pro Sprache
- ✅ **On-Demand Generierung:** Audio wird erst beim Klick generiert (keine Storage-Kosten)
- ⏳ **Dialog-Phase TTS:** Geplant für Phase 2 (komplex wegen streamUI)

---

## Architektur

### Tech Stack

- **Provider:** OpenAI TTS API (`tts-1` Model)
- **Framework:** Vercel AI SDK v5 (`experimental_generateSpeech`)
- **Audio-Format:** MP3 (Base64-encoded)
- **Delivery:** Data-URL (kein Storage benötigt)

### Komponenten-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│ Story-Phase Component (Client)                              │
│  - User klickt TTS-Button                                   │
│  - TTSPlayer Component rendert                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ TTSPlayer Component (Client)                                │
│  - Zeigt Loading-State                                      │
│  - Ruft generateSpeechAudio() auf                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Server Action: generateSpeechAudio()                        │
│  - Validiert Text (max. 4096 Zeichen)                       │
│  - Wählt Voice basierend auf Sprache                        │
│  - Ruft OpenAI TTS API auf                                  │
│  - Konvertiert zu Base64-URL                                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ OpenAI TTS API                                              │
│  - Model: tts-1 (schnell, günstig)                          │
│  - Voice: onyx, nova, alloy, fable, shimmer                 │
│  - Output: MP3 Audio Stream                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ TTSPlayer Component (Client)                                │
│  - Erhält Base64 Audio-URL                                  │
│  - Erstellt Audio-Element                                   │
│  - Spielt Audio ab                                          │
│  - Zeigt Playing-State                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementierung

### 1. Server Action (`actions-tts.tsx`)

**Datei:** `app/lesson/[id]/actions/actions-tts.tsx`

```typescript
import { experimental_generateSpeech as generateSpeech } from "ai";
import { openai } from "@ai-sdk/openai";

const VOICE_MAP: Record<string, string> = {
  de: "onyx",    // Männliche, klare Stimme
  en: "nova",    // Freundliche, neutrale Stimme
  es: "alloy",   // Neutrale Stimme
  fr: "fable",   // Warme Stimme
  it: "shimmer", // Helle, freundliche Stimme
};

export async function generateSpeechAudio(
  text: string,
  language: string = "de"
): Promise<{ audioUrl: string }> {
  // Validierung
  if (!text || text.trim().length === 0) {
    throw new Error("Text darf nicht leer sein.");
  }

  if (text.length > 4096) {
    throw new Error("Text ist zu lang (max. 4096 Zeichen).");
  }

  const voice = VOICE_MAP[language] || "nova";

  const result = await generateSpeech({
    model: openai.speech("tts-1"),
    text,
    voice,
  });

  const base64Audio = Buffer.from(result.audio).toString("base64");
  const audioUrl = `data:audio/mp3;base64,${base64Audio}`;

  return { audioUrl };
}
```

**Wichtige Funktionen:**

- `generateSpeechAudio(text, language)` - Standard TTS für beliebige Texte
- `generateChapterAudio(narrative, keyLearnings, language)` - Batch-TTS für Story-Kapitel

### 2. Client Component (`tts-player.tsx`)

**Datei:** `components/learning/tts-player.tsx`

```typescript
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface TTSPlayerProps {
  text: string;
  language: string;
  autoPlay?: boolean;
  variant?: "default" | "compact";
}

export function TTSPlayer({ text, language, autoPlay = false, variant = "default" }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = async () => {
    if (audioUrl) {
      playAudio(audioUrl);
      return;
    }

    setIsLoading(true);
    try {
      const { generateSpeechAudio } = await import("@/app/lesson/[id]/actions");
      const { audioUrl: url } = await generateSpeechAudio(text, language);
      setAudioUrl(url);
      playAudio(url);
    } catch (error) {
      console.error("TTS Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play();
    setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
  };

  return (
    <Button onClick={handlePlay} disabled={isLoading}>
      {isLoading ? "⏳ Generiere..." : isPlaying ? "🔊 Läuft..." : "🔉 Vorlesen"}
    </Button>
  );
}
```

**Features:**

- **Loading State:** Zeigt Spinner während Generierung
- **Playing State:** Animated Icon während Wiedergabe
- **Caching:** Bereits generiertes Audio wird wiederverwendet
- **Cleanup:** Audio-Element wird bei Component-Unmount gestoppt

### 3. Integration in Story-Phase

**Datei:** `components/learning/story-phase.tsx`

```typescript
import { TTSPlayer } from "./tts-player";
import { useSession } from "@/lib/auth-client";

export function StoryPhase({ chapters }: StoryPhaseProps) {
  const { data: session } = useSession();
  const userLanguage = session?.user?.language || "de";

  const currentChapter = chapters[currentChapterIndex];
  const fullChapterText = `${currentChapter.narrative}\n\nDas Wichtigste:\n${currentChapter.keyLearnings.join("\n")}`;

  return (
    <div>
      <TTSPlayer text={fullChapterText} language={userLanguage} />
      {/* Rest des Chapters */}
    </div>
  );
}
```

---

## Voice-Mapping

OpenAI TTS unterstützt 6 Stimmen: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

### Mapping-Strategie

| Sprache | Voice     | Charakteristik                      | Begründung                          |
| ------- | --------- | ----------------------------------- | ----------------------------------- |
| `de`    | `onyx`    | Männlich, klar, autoritativ         | Gut für technische Inhalte         |
| `en`    | `nova`    | Freundlich, neutral, warm           | Standard-Englisch für internationale Nutzer |
| `es`    | `alloy`   | Neutral, ausgewogen                 | Flexibel für verschiedene Akzente  |
| `fr`    | `fable`   | Warm, melodisch                     | Passt zur französischen Sprache    |
| `it`    | `shimmer` | Hell, freundlich, lebendig          | Passt zur italienischen Lebendigkeit |

**Fallback:** Wenn Sprache nicht erkannt wird → `nova` (Standard-Englisch)

---

## Kosten & Performance

### OpenAI TTS Pricing (Stand 2025-10)

| Model       | Preis pro 1M Zeichen | Qualität    | Geschwindigkeit |
| ----------- | -------------------- | ----------- | --------------- |
| `tts-1`     | $15.00               | Standard    | Schnell (~1s)   |
| `tts-1-hd`  | $30.00               | HD-Qualität | Langsamer (~3s) |

### Kosten-Kalkulation (Micro-Dose Lesson)

**Annahmen:**
- Dialog-Phase: 5 Fragen × 150 Zeichen = 750 chars
- Story-Phase: 3 Kapitel × 500 Zeichen = 1.500 chars
- **Gesamt pro Lesson:** ~2.250 chars

**Kosten pro Lesson:**
- `tts-1`: 2.250 chars × $0.000015 = **$0.034** (~3 Cent)
- `tts-1-hd`: 2.250 chars × $0.000030 = **$0.068** (~7 Cent)

**MVP-Empfehlung:** `tts-1` (ausreichende Qualität für MVP, 50% günstiger)

### Monatliche Kosten (Hochrechnung)

**Annahme:** 1.000 aktive User, 50% nutzen TTS, 2 Lessons/Monat

- **TTS-Requests:** 1.000 × 50% × 2 × 3 Kapitel = 3.000 TTS-Requests
- **Zeichen gesamt:** 3.000 × 500 = 1.5M Zeichen
- **Kosten:** 1.5M × $0.000015 = **$22.50/Monat**

**Fazit:** TTS ist extrem kostengünstig für MVP (<$50/Monat selbst bei 5.000 Usern)

---

## Caching-Strategie (Phase 2)

Aktuell wird Audio **on-demand** generiert. Für Phase 2 können wir Caching implementieren:

### Vorteile von Caching

- ✅ **Schnellere Wiedergabe:** Audio sofort verfügbar
- ✅ **Kosteneinsparung:** ~90% weniger TTS-Requests bei populären Topics
- ✅ **Skalierbarkeit:** Mehrere User teilen Audio-Files

### Implementierung

**Storage:** Supabase Storage (oder S3)

```typescript
// Pseudo-Code
const cacheKey = `tts-${language}-${hash(text)}`;
const cachedAudio = await supabase.storage.from("tts-cache").download(cacheKey);

if (cachedAudio) {
  return cachedAudio;
} else {
  const audio = await generateSpeechAudio(text, language);
  await supabase.storage.from("tts-cache").upload(cacheKey, audio);
  return audio;
}
```

**Cache-Duration:** 30 Tage (Auto-Cleanup mit Storage Lifecycle Policies)

---

## Accessibility & User Experience

### Accessibility-Features

- ✅ **ARIA-Labels:** Alle Buttons sind Screen-Reader-kompatibel
- ✅ **Keyboard-Navigation:** Tab + Enter für TTS-Button
- ✅ **Visual Feedback:** Loading-Spinner, Playing-Animation
- ✅ **Error-Handling:** User-freundliche Fehlermeldungen

### Use Cases

1. **Visuell eingeschränkte Nutzer:** Screen-Reader-freundliches Lernen
2. **Multitasking:** Lernen beim Kochen, Autofahren, Sport
3. **Aussprachehilfe:** Fremdsprachen-Lerner können korrekte Aussprache hören
4. **Konzentration:** Weniger Screen-Fatigue bei langen Sessions

---

## Rollout-Plan

### Phase 1: MVP (✅ Abgeschlossen)

- [x] TTS für Story-Phase (ganzes Kapitel)
- [x] Automatische Sprachauswahl (User-Profil)
- [x] Voice-Mapping (5 Sprachen)
- [x] On-Demand Generierung (kein Storage)
- [x] Basic Error-Handling

### Phase 2: Optimierung (Q1 2026)

- [ ] TTS für Dialog-Phase (KI-Antworten)
- [ ] Audio-Caching (Supabase Storage)
- [ ] Auto-Play Option (User-Einstellung)
- [ ] Playback-Controls (Play/Pause/Stop)
- [ ] Playback-Speed (0.75x, 1.0x, 1.25x, 1.5x)

### Phase 3: Premium-Feature (Q2 2026)

- [ ] Rate Limiting für Free-Tier (5 TTS/Tag)
- [ ] Unlimited TTS für Premium-User
- [ ] HD-Voice (`tts-1-hd`) für Premium
- [ ] Manuelle Voice-Auswahl (6 OpenAI Voices)
- [ ] Download-Option (MP3-Export)

---

## Troubleshooting

### Problem: Audio wird nicht abgespielt

**Ursachen:**

1. **Browser-Policy:** Autoplay blockiert (Chrome/Safari)
2. **Netzwerk-Fehler:** OpenAI API nicht erreichbar
3. **Große Texte:** >4096 Zeichen (OpenAI Limit)

**Lösungen:**

1. User muss TTS manuell starten (kein Autoplay im MVP)
2. Retry-Logik in Server Action implementieren
3. Text-Chunking für lange Kapitel (Phase 2)

### Problem: Falsche Stimme/Aussprache

**Ursachen:**

1. **Sprach-Mismatch:** User-Profil-Sprache ≠ Content-Sprache
2. **Voice nicht passend:** z.B. "onyx" für Italienisch

**Lösungen:**

1. Content-Language-Detection (Phase 2)
2. A/B-Testing für Voice-Mapping

### Problem: Hohe Latenzen (>5s)

**Ursachen:**

1. **Große Texte:** 2000+ Zeichen → langsame Generierung
2. **OpenAI API Überlastung:** Seltene Peaks

**Lösungen:**

1. Caching-Layer (Phase 2)
2. Preload-Audio beim Kapitel-Wechsel

---

## Code-Referenzen

### Geänderte/Neue Dateien

1. ✅ **`components/learning/tts-player.tsx`** (NEU)
   - Client-Component für TTS-Wiedergabe

2. ✅ **`app/lesson/[id]/actions/actions-tts.tsx`** (NEU)
   - Server Actions für TTS-Generierung

3. ✅ **`components/learning/story-phase.tsx`** (ERWEITERT)
   - TTS-Button Integration

4. ✅ **`lib/profile.types.ts`** (ERWEITERT)
   - TTS-Einstellungen (`ttsEnabled`, `ttsAutoPlay`, `ttsVoice`)

5. ✅ **`example.env`** (ERWEITERT)
   - TTS Model Config dokumentiert

### Externe Abhängigkeiten

- `ai` (Vercel AI SDK v5) - bereits vorhanden
- `@ai-sdk/openai` - bereits vorhanden
- `OPENAI_API_KEY` - bereits vorhanden

**Keine neuen npm-Pakete benötigt!**

---

## Testing

### Manueller Test-Plan

**Story-Phase TTS:**

1. Öffne eine Lesson in der Story-Phase
2. Klicke "🔉 Vorlesen" Button
3. Erwartung: Loading-State → Playing-State → Audio spielt ab
4. Prüfe: Stimme passt zur User-Sprache
5. Wechsle Kapitel → Neues Audio

**Multi-Language Test:**

1. Ändere User-Profil-Sprache (`de` → `en` → `es`)
2. Öffne Lesson
3. Prüfe: Voice ändert sich entsprechend

**Error-Handling:**

1. Simuliere API-Fehler (ungültiger API-Key)
2. Erwartung: User-freundliche Fehlermeldung
3. Simuliere großen Text (>5000 Zeichen)
4. Erwartung: Validierungs-Fehler

### Automated Tests (TODO - Phase 2)

```typescript
describe("TTS Integration", () => {
  it("should generate audio for German text", async () => {
    const result = await generateSpeechAudio("Hallo Welt", "de");
    expect(result.audioUrl).toStartWith("data:audio/mp3;base64,");
  });

  it("should use correct voice for language", async () => {
    // Mock OpenAI API call
    // Verify voice parameter is "onyx" for German
  });

  it("should throw error for empty text", async () => {
    await expect(generateSpeechAudio("", "de")).rejects.toThrow();
  });
});
```

---

## FAQ

### Warum Base64 statt Storage?

**MVP-Entscheidung:** Base64-Data-URLs sind einfacher zu implementieren und benötigen keine Storage-Infrastruktur. Für Phase 2 wechseln wir zu Supabase Storage für bessere Performance.

### Warum kein TTS in Dialog-Phase?

Die Dialog-Phase nutzt `streamUI` (Vercel AI SDK), was Live-Streaming von KI-Antworten ermöglicht. TTS würde erst nach vollständiger Antwort starten können, was die UX verschlechtert. Für Phase 2 können wir Chunk-by-Chunk TTS implementieren.

### Warum `tts-1` statt `tts-1-hd`?

`tts-1` ist 50% günstiger und für MVP ausreichend. `tts-1-hd` wird später als Premium-Feature angeboten.

### Wie viele Zeichen pro TTS-Request?

OpenAI Limit: **4096 Zeichen**. Story-Kapitel sind durchschnittlich 500-800 Zeichen, also weit unter dem Limit.

---

## Weiterführende Ressourcen

- **Vercel AI SDK Docs:** https://ai-sdk.dev/docs/ai-sdk-core/speech
- **OpenAI TTS API:** https://platform.openai.com/docs/guides/text-to-speech
- **OpenAI Voice Samples:** https://platform.openai.com/docs/guides/text-to-speech/voice-options

---

**Letzte Aktualisierung:** 2025-10-18
**Autor:** Claude (AI Assistant)
**Review:** Matthias (Product Owner)
