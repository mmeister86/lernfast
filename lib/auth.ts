import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { magicLink } from "better-auth/plugins";
import { emailHarmony } from "better-auth-harmony";
import { Unsend } from "unsend";

// Lazy-Initialisierung des Unsend-Clients, um Build-Fehler zu vermeiden
// Wird erst erstellt, wenn tatsächlich eine E-Mail gesendet werden soll
let unsendClient: Unsend | null = null;
function getUnsendClient(): Unsend {
  if (!unsendClient) {
    if (!process.env.UNSEND_API_KEY) {
      throw new Error("UNSEND_API_KEY environment variable is not set");
    }
    // Self-hosted: Base-URL angeben, Cloud: undefined lassen
    const baseUrl = process.env.UNSEND_BASE_URL;
    unsendClient = new Unsend(
      process.env.UNSEND_API_KEY,
      baseUrl // Optional: nur für self-hosted Instanzen
    );
  }
  return unsendClient;
}

// Supabase connection string format:
// postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  user: {
    additionalFields: {
      age: {
        type: "number",
        required: false,
        input: true, // User kann dieses Feld setzen
      },
      language: {
        type: "string",
        required: false,
        defaultValue: "de",
        input: true,
      },
      learningGoals: {
        type: "string",
        required: false,
        input: true,
        fieldName: "learning_goals",
      },
      experienceLevel: {
        type: "string",
        required: false,
        defaultValue: "beginner",
        input: true,
        fieldName: "experience_level",
      },
      preferredDifficulty: {
        type: "string",
        required: false,
        defaultValue: "medium",
        input: true,
        fieldName: "preferred_difficulty",
      },
      preferredCardCount: {
        type: "number",
        required: false,
        defaultValue: 5,
        input: true,
        fieldName: "preferred_card_count",
      },
      onboardingCompleted: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: true,
        fieldName: "onboarding_completed",
      },
      profileUpdatedAt: {
        type: "date",
        required: false,
        input: false, // Wird automatisch vom Trigger gesetzt
        fieldName: "profile_updated_at",
      },
      ttsVoice: {
        type: "string",
        required: false,
        defaultValue: "nova",
        input: true, // Erlaubt Input bei Registrierung
        fieldName: "tts_voice",
      },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({ user, newEmail, url, token }) => {
        try {
          await getUnsendClient().emails.send({
            from: "noreply@lernfa.st",
            to: user.email, // Bestätigung an alte E-Mail-Adresse
            subject: "E-Mail-Adresse ändern - Bestätigung erforderlich",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #000; font-size: 24px; font-weight: 800;">lernfa.st</h1>
                <p style="font-size: 16px; color: #333;">
                  Hallo ${user.name || "User"},<br/><br/>
                  Du möchtest deine E-Mail-Adresse zu <strong>${newEmail}</strong> ändern.
                </p>
                <p style="font-size: 16px; color: #333;">
                  Klicke auf den Button unten, um diese Änderung zu bestätigen:
                </p>
                <a
                  href="${url}"
                  style="
                    display: inline-block;
                    background-color: #000;
                    color: #fff;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 15px;
                    border: 2px solid #000;
                    box-shadow: 4px 4px 0px #000;
                    font-weight: 500;
                    margin: 20px 0;
                  "
                >
                  E-Mail-Änderung bestätigen
                </a>
                <p style="font-size: 14px; color: #666;">
                  Oder kopiere diesen Link in deinen Browser:<br/>
                  <code style="background: #f4f4f4; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    ${url}
                  </code>
                </p>
                <p style="font-size: 12px; color: #999; margin-top: 30px;">
                  Dieser Link ist 15 Minuten gültig. Falls du diese Änderung nicht angefordert hast, ignoriere diese E-Mail.
                </p>
              </div>
            `,
          });
        } catch (error) {
          console.error("Failed to send email change verification:", error);
          throw error;
        }
      },
    },
  },
  plugins: [
    emailHarmony({
      allowNormalizedSignin: true, // Erlaubt Login mit normalisierter Email-Variante
    }),
    magicLink({
      sendMagicLink: async ({ email, token, url }, request) => {
        try {
          await getUnsendClient().emails.send({
            from: "noreply@lernfa.st",
            to: email,
            subject: "Dein Magic Link für lernfa.st",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #000; font-size: 24px; font-weight: 800;">lernfa.st</h1>
                <p style="font-size: 16px; color: #333;">
                  Klicke auf den Button unten, um dich anzumelden:
                </p>
                <a
                  href="${url}"
                  style="
                    display: inline-block;
                    background-color: #000;
                    color: #fff;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 15px;
                    border: 2px solid #000;
                    box-shadow: 4px 4px 0px #000;
                    font-weight: 500;
                    margin: 20px 0;
                  "
                >
                  Jetzt anmelden
                </a>
                <p style="font-size: 14px; color: #666;">
                  Oder kopiere diesen Link in deinen Browser:<br/>
                  <code style="background: #f4f4f4; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    ${url}
                  </code>
                </p>
                <p style="font-size: 12px; color: #999; margin-top: 30px;">
                  Dieser Link ist 15 Minuten gültig. Falls du diese E-Mail nicht angefordert hast, ignoriere sie einfach.
                </p>
              </div>
            `,
          });
        } catch (error) {
          console.error("Failed to send magic link email:", error);
          throw error;
        }
      },
    }),
  ],
});
