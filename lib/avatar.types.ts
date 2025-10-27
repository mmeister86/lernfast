/**
 * Avatar Types & Helper Functions
 * DiceBear Open Peeps Integration für Lernfa.st
 */

import { z } from "zod";
import { createAvatar } from "@dicebear/core";
import { openPeeps } from "@dicebear/collection";

// ============================================
// DiceBear Open Peeps Kategorien
// ============================================

export const AVATAR_ACCESSORIES = [
  "none",
  "glasses",
  "shades",
  "sunglasses",
] as const;

export const AVATAR_BODIES = [
  "checkered",
  "plain",
  "rounded",
  "small",
] as const;

export const AVATAR_FACES = [
  "angryWithFang",
  "awe",
  "blank",
  "calm",
  "cheeky",
  "concerned",
  "confused",
  "cute",
  "driven",
  "eatingHappy",
  "explaining",
  "eyesClosed",
  "eyesShut",
  "fervent",
  "grateful",
  "grin",
  "grinBig",
  "grinHearts",
  "grinLol",
  "grinSquint",
  "grinStars",
  "grinSweat",
  "handsDown",
  "hearts",
  "lovingGrin1",
  "lovingGrin2",
  "monster",
  "nerd",
  "oldBroad",
  "open",
  "rage",
  "relief",
  "sad",
  "shy",
  "sick",
  "suspicious",
  "tired",
  "unimpressed",
  "veryHappy",
] as const;

export const AVATAR_FACIAL_HAIRS = [
  "none",
  "beard",
  "soulPatch",
  "walrus",
] as const;

export const AVATAR_HEADS = [
  "afro",
  "bangs",
  "bangs2",
  "bantuKnots",
  "bear",
  "bun",
  "bun2",
  "buns",
  "cornrows",
  "cornrows2",
  "dreads1",
  "dreads2",
  "flatTop",
  "flatTopLong",
  "grayBun",
  "grayMedium",
  "grayShort",
  "hatBeanie",
  "hatHip",
  "hijab",
  "long",
  "longAfro",
  "longBangs",
  "longCurly",
  "medium1",
  "medium2",
  "medium3",
  "mediumBangs",
  "mediumBangs2",
  "mediumBangs3",
  "mediumStraight",
  "mohawk",
  "mohawk2",
  "noHair",
  "pigtails",
  "pomp",
  "shaved",
  "shaved2",
  "shaved3",
  "shavedSides",
  "short",
  "shortCombover",
  "shortComboverChops",
  "shortDreads",
  "shortDreads2",
  "sides",
  "turban",
  "twists",
  "twists2",
] as const;

export const AVATAR_MOUTHS = [
  "bigSmile",
  "frown",
  "lips",
  "pacifier",
  "smile",
  "smirk",
  "surprise",
] as const;

export const AVATAR_NOSES = [
  "curve",
  "pointed",
  "round",
  "smallRound",
] as const;

// ============================================
// Types
// ============================================

export type AvatarAccessory = (typeof AVATAR_ACCESSORIES)[number];
export type AvatarBody = (typeof AVATAR_BODIES)[number];
export type AvatarFace = (typeof AVATAR_FACES)[number];
export type AvatarFacialHair = (typeof AVATAR_FACIAL_HAIRS)[number];
export type AvatarHead = (typeof AVATAR_HEADS)[number];
export type AvatarMouth = (typeof AVATAR_MOUTHS)[number];
export type AvatarNose = (typeof AVATAR_NOSES)[number];

export interface AvatarConfig {
  accessory?: AvatarAccessory;
  body?: AvatarBody;
  face?: AvatarFace;
  facialHair?: AvatarFacialHair;
  head?: AvatarHead;
  mouth?: AvatarMouth;
  nose?: AvatarNose;
  backgroundColor?: string[];
}

// ============================================
// Zod Schema
// ============================================

export const avatarConfigSchema = z.object({
  accessory: z.enum(AVATAR_ACCESSORIES).optional(),
  body: z.enum(AVATAR_BODIES).optional(),
  face: z.enum(AVATAR_FACES).optional(),
  facialHair: z.enum(AVATAR_FACIAL_HAIRS).optional(),
  head: z.enum(AVATAR_HEADS).optional(),
  mouth: z.enum(AVATAR_MOUTHS).optional(),
  nose: z.enum(AVATAR_NOSES).optional(),
  backgroundColor: z.array(z.string()).optional(),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Generiert einen Avatar als Data URI (String)
 * Für Verwendung in img src oder CSS background-image
 *
 * @param config - Avatar-Konfiguration (accessory, face, head, etc.)
 * @param size - Größe des Avatars in Pixeln
 * @param userId - Optional: User-ID für festen Seed (empfohlen für Konsistenz)
 *                 Ohne userId: Config wird als Seed verwendet (für Live-Preview)
 */
export function generateAvatarDataUri(
  config: AvatarConfig | null | undefined,
  size: number = 256,
  userId?: string
): string {
  // [AVATAR-DEBUG] Log input config
  console.log("[AVATAR-DEBUG] generateAvatarDataUri Input:", {
    config,
    configType: typeof config,
    configKeys: config ? Object.keys(config) : null,
    isEmpty: !config || Object.keys(config).length === 0,
    size,
    userId,
    hasUserId: !!userId,
  });

  if (!config || Object.keys(config).length === 0) {
    // Fallback: Leeren Avatar mit Standard-Optionen
    const fallbackUri = createAvatar(openPeeps, {
      size,
      seed: userId || 'default-fallback-seed',
    }).toDataUri();

    console.log("[AVATAR-DEBUG] generateAvatarDataUri Fallback:", {
      uriLength: fallbackUri.length,
      uriPreview: fallbackUri.substring(0, 100),
      usedSeed: userId || 'default-fallback-seed',
    });

    return fallbackUri;
  }

  // FIXED: Use userId as seed for consistency, or config-based seed for preview
  // - WITH userId: Same seed = Same random features (consistent across reloads)
  // - WITHOUT userId: Config-based seed = Live preview of changes
  const seed = userId || JSON.stringify(config);

  // [AVATAR-DEBUG] Log seed generation
  console.log("[AVATAR-DEBUG] generateAvatarDataUri Seed:", {
    seed,
    seedLength: seed.length,
    seedType: userId ? 'userId (fixed)' : 'config (dynamic)',
  });

  // Entferne undefined-Werte aus Config
  const cleanConfig = Object.fromEntries(
    Object.entries(config).filter(([_, v]) => v !== undefined && v !== null)
  );

  // [AVATAR-DEBUG] Log clean config
  console.log("[AVATAR-DEBUG] generateAvatarDataUri CleanConfig:", {
    cleanConfig,
    cleanConfigKeys: Object.keys(cleanConfig),
  });

  const dataUri = createAvatar(openPeeps, {
    seed, // Ensures same config always generates same avatar
    ...cleanConfig,
    size,
  }).toDataUri();

  // [AVATAR-DEBUG] Log output
  console.log("[AVATAR-DEBUG] generateAvatarDataUri Output:", {
    uriLength: dataUri.length,
    uriPreview: dataUri.substring(0, 100),
  });

  return dataUri;
}

/**
 * Generiert einen neuen Avatar basierend auf User-ID
 * Nützlich für Default-Avatare
 */
export function generateDefaultAvatar(
  userId: string,
  size: number = 256
): string {
  return createAvatar(openPeeps, {
    seed: userId, // Deterministisch basierend auf User-ID
    size,
  }).toDataUri();
}

/**
 * Generiert einen zufälligen Avatar
 * Für "Zufällig"-Button im Editor
 */
export function generateRandomAvatar(size: number = 256): AvatarConfig {
  const config: AvatarConfig = {};

  // Zufällige Auswahl aus jeder Kategorie
  const randomItem = <T extends readonly string[]>(arr: T): T[number] =>
    arr[Math.floor(Math.random() * arr.length)];

  const randomBool = () => Math.random() > 0.5;

  if (randomBool()) config.accessory = randomItem(AVATAR_ACCESSORIES);
  if (randomBool()) config.body = randomItem(AVATAR_BODIES);
  if (randomBool()) config.face = randomItem(AVATAR_FACES);
  if (randomBool()) config.facialHair = randomItem(AVATAR_FACIAL_HAIRS);
  if (randomBool()) config.head = randomItem(AVATAR_HEADS);
  if (randomBool()) config.mouth = randomItem(AVATAR_MOUTHS);
  if (randomBool()) config.nose = randomItem(AVATAR_NOSES);

  // Zufällige Hintergrundfarbe aus Retro-Palette
  if (randomBool()) {
    config.backgroundColor = [
      "#FFC667", // Peach
      "#FB7DA8", // Pink
      "#FC5A46", // Coral
      "#662CB7", // Purple
      "#00D9BE", // Teal
      "#0CBCD7", // Blue
    ];
  }

  return config;
}

/**
 * Prüft, ob ein AvatarConfig vollständig ist
 */
export function isValidAvatarConfig(config: any): config is AvatarConfig {
  return avatarConfigSchema.safeParse(config).success;
}
