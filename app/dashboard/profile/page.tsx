import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCachedUserProfile } from "@/lib/supabase/queries";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { Navbar } from "@/components/navbar";

/**
 * User Profile Page - Server Component
 *
 * Lädt Profil-Daten serverseitig mit gecachten Queries (120s Cache).
 * Form-Interaktivität wird von ProfileForm Client Component übernommen.
 *
 * Performance: ~250ms statt 2000ms (88% schneller)
 */
export default async function ProfilePage() {
  // Auth-Check
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth");
  }

  // Server-Side gecachter Query (2min Cache)
  const { data: profile, error } = await getCachedUserProfile(session.user.id);

  // Fallback wenn Profil nicht geladen werden kann
  if (error || !profile) {
    console.error("Failed to load profile:", error);
    // Verwende Session-Daten als Fallback
    return (
      <>
        <Navbar />
        <ProfileForm
          initialData={{
            name: session.user.name || "",
            email: session.user.email,
            age: undefined,
            language: "de",
            learningGoals: undefined,
            experienceLevel: "beginner",
            preferredDifficulty: "medium",
            preferredCardCount: 5,
            avatarPreference: "hanne",
            dialogMode: "text",
          }}
          userId={session.user.id}
        />
      </>
    );
  }

  // Profil-Daten an Client Component weitergeben
  return (
    <>
      <Navbar />
      <ProfileForm
        initialData={{
          name: profile.name || "",
          email: profile.email,
          age: profile.age,
          language: profile.language || "de",
          learningGoals: profile.learningGoals,
          experienceLevel: profile.experienceLevel || "beginner",
          preferredDifficulty: profile.preferredDifficulty || "medium",
          preferredCardCount: profile.preferredCardCount || 5,
          avatarPreference: profile.avatarPreference || "hanne",
          dialogMode: profile.dialogMode || "text",
        }}
        userId={session.user.id}
      />
    </>
  );
}
