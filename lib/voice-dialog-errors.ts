/**
 * Voice Dialog Error Classes
 * Separate file da "use server" Dateien nur async Funktionen exportieren dürfen
 */

export class VoiceDialogError extends Error {
  constructor(
    message: string,
    public code:
      | "WHISPER_FAILED"
      | "LLM_FAILED"
      | "TTS_FAILED"
      | "ASSESSMENT_FAILED"
  ) {
    super(message);
    this.name = "VoiceDialogError";
  }
}

/**
 * Retry-Logik für API-Calls
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Attempt ${attempt + 1} failed:`, error);

      if (attempt < maxRetries) {
        await delay(delayMs * Math.pow(2, attempt)); // Exponential backoff
      }
    }
  }

  throw lastError!;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
