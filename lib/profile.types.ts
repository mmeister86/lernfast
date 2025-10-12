/**
 * TypeScript Types & Zod Schemas für User Profile
 * Lernfa.st - 2025
 */

import { z } from "zod";

// ============================================
// Enums & Constants
// ============================================

export const LANGUAGES = ["de", "en", "es", "fr", "it"] as const;
export const EXPERIENCE_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
] as const;
export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"] as const;

export type Language = (typeof LANGUAGES)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

// ============================================
// Zod Schema für Validation
// ============================================

/**
 * Validierungs-Schema für Profil-Updates
 * Alle Felder sind optional (partial update)
 */
export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(2, "Name muss mindestens 2 Zeichen lang sein")
    .max(100, "Name darf maximal 100 Zeichen lang sein")
    .optional(),
  age: z
    .number()
    .int()
    .min(6, "Mindestalter ist 6 Jahre")
    .max(120, "Maximalalter ist 120 Jahre")
    .optional()
    .nullable(),
  language: z.enum(LANGUAGES).optional(),
  learningGoals: z
    .string()
    .max(500, "Lernziele dürfen maximal 500 Zeichen lang sein")
    .optional()
    .nullable(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
  preferredDifficulty: z.enum(DIFFICULTY_LEVELS).optional(),
  preferredCardCount: z
    .number()
    .int()
    .min(3, "Minimum 3 Karten pro Session")
    .max(20, "Maximum 20 Karten pro Session")
    .optional(),
});

/**
 * TypeScript Type für Profil-Update-Payload
 */
export type ProfileUpdatePayload = z.infer<typeof profileUpdateSchema>;

/**
 * Komplettes User-Profil (aus Better Auth Session + zusätzliche Felder)
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  image?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Zusätzliche Profilfelder
  age?: number | null;
  language: Language;
  learningGoals?: string | null;
  experienceLevel: ExperienceLevel;
  preferredDifficulty: DifficultyLevel;
  preferredCardCount: number;
  onboardingCompleted: boolean;
  profileUpdatedAt?: Date | null;
}

// ============================================
// Display Labels (für UI)
// ============================================

export const LANGUAGE_LABELS: Record<Language, string> = {
  de: "Deutsch",
  en: "English",
  es: "Español",
  fr: "Français",
  it: "Italiano",
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Anfänger",
  intermediate: "Fortgeschritten",
  advanced: "Experte",
};

export const DIFFICULTY_LEVEL_LABELS: Record<DifficultyLevel, string> = {
  easy: "Einfach",
  medium: "Mittel",
  hard: "Schwer",
};

// ============================================
// Helper Functions
// ============================================

/**
 * Prüft, ob ein Profil vollständig ausgefüllt ist
 */
export function isProfileComplete(profile: Partial<UserProfile>): boolean {
  return !!(
    profile.name &&
    profile.age &&
    profile.language &&
    profile.learningGoals &&
    profile.experienceLevel &&
    profile.preferredDifficulty
  );
}

/**
 * Berechnet Profil-Vollständigkeit in Prozent
 */
export function getProfileCompleteness(profile: Partial<UserProfile>): number {
  const fields = [
    profile.name,
    profile.age,
    profile.language,
    profile.learningGoals,
    profile.experienceLevel,
    profile.preferredDifficulty,
  ];
  const filledFields = fields.filter((field) => !!field).length;
  return Math.round((filledFields / fields.length) * 100);
}
