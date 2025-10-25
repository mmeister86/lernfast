/**
 * Audio Utilities für Voice Dialog Integration
 * Browser-seitige und Server-seitige Audio-Helper
 */

// ============================================
// BROWSER-SEITIGE UTILITIES
// ============================================

/**
 * Setup MediaRecorder für Audio-Aufnahme
 * Konfiguriert optimale Einstellungen für Sprach-Aufnahme
 */
export function setupAudioRecorder(): MediaRecorder {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("MediaRecorder API nicht unterstützt");
  }

  // Optimale Einstellungen für Sprach-Aufnahme
  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16000, // Ausreichend für Sprache
      channelCount: 1, // Mono
    },
  };

  return new MediaRecorder(new MediaStream(), {
    mimeType: "audio/webm;codecs=opus", // Beste Browser-Unterstützung + Kompression
    audioBitsPerSecond: 16000, // 16kbps - ausreichend für Sprache
  });
}

/**
 * Audio Playback Helper
 * Erstellt Audio-Element und spielt Base64-URL ab
 */
export function playAudio(audioUrl: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);

    audio.onloadeddata = () => {
      audio
        .play()
        .then(() => {
          console.log("✅ Audio playback started");
          resolve(audio);
        })
        .catch((error) => {
          console.error("❌ Audio playback failed:", error);
          reject(error);
        });
    };

    audio.onerror = (error) => {
      console.error("❌ Audio load error:", error);
      reject(new Error("Audio konnte nicht geladen werden"));
    };

    // Timeout nach 10s
    setTimeout(() => {
      reject(new Error("Audio-Loading Timeout"));
    }, 10000);
  });
}

/**
 * Konvertiert Blob zu Buffer für Server-Upload
 */
export async function blobToBuffer(blob: Blob): Promise<Buffer> {
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Audio Format Detection
 * Prüft unterstützte Audio-Formate im Browser
 */
export function getSupportedAudioFormats(): string[] {
  const formats = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/wav",
  ];

  return formats.filter((format) => {
    return MediaRecorder.isTypeSupported(format);
  });
}

/**
 * Audio Recording Helper
 * Wrapper für MediaRecorder mit Promise-basiertem API
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];

  constructor() {
    this.mediaRecorder = setupAudioRecorder();
  }

  /**
   * Startet Audio-Aufnahme
   */
  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        },
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 16000,
      });

      this.chunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // 100ms chunks
      console.log("🎤 Recording started");
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      throw new Error("Mikrofon-Zugriff verweigert oder nicht verfügbar");
    }
  }

  /**
   * Stoppt Audio-Aufnahme und gibt Blob zurück
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        reject(new Error("Keine aktive Aufnahme"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: "audio/webm;codecs=opus" });
        console.log(`🎤 Recording stopped, size: ${blob.size} bytes`);

        // Cleanup
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        resolve(blob);
      };

      this.mediaRecorder.onerror = (error) => {
        console.error("❌ Recording error:", error);
        reject(new Error("Aufnahme-Fehler"));
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Prüft ob Mikrofon-Permission erteilt wurde
   */
  async checkPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup bei Component Unmount
   */
  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}

// ============================================
// SERVER-SEITIGE UTILITIES
// ============================================

/**
 * Audio Format Conversion (falls nötig)
 * Konvertiert verschiedene Audio-Formate zu MP3 für OpenAI Whisper
 */
export async function convertToMP3(blob: Blob): Promise<Buffer> {
  // Für MVP: Direkte Konvertierung zu Buffer
  // In Phase 2: Echte Audio-Konvertierung mit ffmpeg
  return blobToBuffer(blob);
}

/**
 * Audio File Validation
 * Prüft Audio-Datei auf Größe und Format
 */
export function validateAudioFile(blob: Blob): {
  valid: boolean;
  error?: string;
} {
  // Max File Size: 10MB (entspricht ~10 Minuten Audio)
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (blob.size > maxSize) {
    return {
      valid: false,
      error: "Audio-Datei zu groß (max. 10MB)",
    };
  }

  // MIME Type Validation
  const allowedTypes = [
    "audio/webm",
    "audio/opus",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
  ];

  if (!allowedTypes.includes(blob.type)) {
    return {
      valid: false,
      error: `Audio-Format nicht unterstützt: ${blob.type}`,
    };
  }

  return { valid: true };
}

/**
 * Audio Duration Estimation
 * Schätzt Audio-Dauer basierend auf Dateigröße
 */
export function estimateAudioDuration(blob: Blob): number {
  // Schätzung: ~1KB pro Sekunde bei 16kbps
  const estimatedDuration = blob.size / 1024; // Sekunden
  return Math.min(estimatedDuration, 30); // Max 30s
}

// ============================================
// ERROR HANDLING
// ============================================

export class AudioError extends Error {
  constructor(
    message: string,
    public code:
      | "PERMISSION_DENIED"
      | "RECORDING_FAILED"
      | "PLAYBACK_FAILED"
      | "FORMAT_UNSUPPORTED"
  ) {
    super(message);
    this.name = "AudioError";
  }
}

/**
 * Audio Error Handler
 * Zentralisierte Fehlerbehandlung für Audio-Operationen
 */
export function handleAudioError(error: unknown): AudioError {
  if (error instanceof AudioError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.name === "NotAllowedError") {
      return new AudioError(
        "Mikrofon-Zugriff verweigert. Bitte erlaube den Zugriff in deinen Browser-Einstellungen.",
        "PERMISSION_DENIED"
      );
    }

    if (error.name === "NotFoundError") {
      return new AudioError(
        "Kein Mikrofon gefunden. Bitte verbinde ein Mikrofon und versuche es erneut.",
        "RECORDING_FAILED"
      );
    }

    if (error.message.includes("play")) {
      return new AudioError(
        "Audio-Wiedergabe fehlgeschlagen. Bitte versuche es erneut.",
        "PLAYBACK_FAILED"
      );
    }
  }

  return new AudioError(
    "Unbekannter Audio-Fehler. Bitte versuche es erneut.",
    "RECORDING_FAILED"
  );
}
