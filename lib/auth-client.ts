import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000"),
  plugins: [
    magicLinkClient(),
    inferAdditionalFields({
      user: {
        age: {
          type: "number",
        },
        language: {
          type: "string",
        },
        learningGoals: {
          type: "string",
        },
        experienceLevel: {
          type: "string",
        },
        preferredDifficulty: {
          type: "string",
        },
        preferredCardCount: {
          type: "number",
        },
        onboardingCompleted: {
          type: "boolean",
        },
        profileUpdatedAt: {
          type: "date",
        },
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
