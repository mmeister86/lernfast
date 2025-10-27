"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  generateAvatarDataUri,
  generateDefaultAvatar,
  type AvatarConfig,
} from "@/lib/avatar.types";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  userId?: string;
  avatarConfig?: AvatarConfig | null;
  fallbackImage?: string | null;
  fallbackInitials?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP = {
  sm: 32,
  md: 40,
  lg: 64,
  xl: 128,
};

export function UserAvatar({
  userId,
  avatarConfig,
  fallbackImage,
  fallbackInitials = "U",
  size = "md",
  className,
}: UserAvatarProps) {
  // [AVATAR-DEBUG] Log input props
  console.log("[AVATAR-DEBUG] UserAvatar Props:", {
    avatarConfig,
    avatarConfigType: typeof avatarConfig,
    avatarConfigKeys: avatarConfig ? Object.keys(avatarConfig) : null,
    fallbackImage,
    userId,
    size,
    sizePixels: SIZE_MAP[size],
  });

  // Generiere Avatar als Data URI
  const avatarDataUri = useMemo(() => {
    if (avatarConfig) {
      // FIXED: Pass userId for consistent seed (same avatar across reloads)
      const uri = generateAvatarDataUri(avatarConfig, SIZE_MAP[size], userId);
      console.log("[AVATAR-DEBUG] UserAvatar Generated URI:", {
        uriLength: uri.length,
        uriPreview: uri.substring(0, 100),
        userId,
      });
      return uri;
    }

    // Fallback 1: Normaler Fallback-Bild
    if (fallbackImage) {
      console.log("[AVATAR-DEBUG] UserAvatar Using Fallback Image");
      return fallbackImage;
    }

    // Fallback 2: Standard-Avatar basierend auf User-ID
    if (userId) {
      console.log("[AVATAR-DEBUG] UserAvatar Using Default Avatar (userId)");
      return generateDefaultAvatar(userId, SIZE_MAP[size]);
    }

    // Fallback 3: null (zeigt dann Initialen)
    console.log("[AVATAR-DEBUG] UserAvatar Using Initials Fallback");
    return null;
  }, [avatarConfig, fallbackImage, userId, size]);

  return (
    <Avatar
      className={cn(
        "border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
        className
      )}
    >
      <AvatarImage
        src={avatarDataUri || undefined}
        alt={fallbackInitials}
        className="object-cover"
      />
      <AvatarFallback className="bg-[#FFC667] text-black font-extrabold">
        {fallbackInitials}
      </AvatarFallback>
    </Avatar>
  );
}
