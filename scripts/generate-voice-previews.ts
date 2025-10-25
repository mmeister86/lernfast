import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PREVIEW_TEXTS = [
  "Hallo! Ich bin deine Lernassistentin. Lass uns gemeinsam lernen!",
  "Mit mir kannst du komplexe Themen einfach verstehen.",
  "Wähle die Stimme, die dir am besten gefällt!",
];

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;

async function generatePreviews() {
  const outputDir = path.join(process.cwd(), "public/audio/voice-previews");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created directory: ${outputDir}`);
  }

  console.log(`🎙️ Generating ${VOICES.length} voice previews...\n`);

  for (const voice of VOICES) {
    try {
      console.log(`🎤 Generating preview for "${voice}"...`);

      const combinedText = PREVIEW_TEXTS.join(" ");

      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice,
        input: combinedText,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      const filePath = path.join(outputDir, `${voice}-preview.mp3`);

      fs.writeFileSync(filePath, buffer);
      console.log(
        `✅ Generated: ${voice}-preview.mp3 (${(buffer.length / 1024).toFixed(
          2
        )} KB)\n`
      );
    } catch (error) {
      console.error(`❌ Failed to generate ${voice}:`, error);
      process.exit(1); // Fail fast
    }
  }

  console.log(`🎉 Successfully generated all ${VOICES.length} voice previews!`);
}

generatePreviews().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
