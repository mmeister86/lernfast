import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { magicLink } from "better-auth/plugins";
import { Unsend } from "unsend";

const unsend = new Unsend(process.env.UNSEND_API_KEY!);

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
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, token, url }, request) => {
        try {
          await unsend.emails.send({
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
