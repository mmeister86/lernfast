"use client";

import { useMemo } from "react";
import { generateAvatarDataUri, type AvatarConfig } from "@/lib/avatar.types";
import { cn } from "@/lib/utils";

interface AvatarPreviewProps {
  config: AvatarConfig;
  size?: number;
  className?: string;
}

export function AvatarPreview({
  config,
  size = 256,
  className,
}: AvatarPreviewProps) {
  // IMPORTANT: NO userId here! This ensures live preview shows exact changes.
  // Config-based seed means: when user changes accessory, only accessory changes
  const avatarDataUri = useMemo(
    () => generateAvatarDataUri(config, size), // No userId = config-based seed
    [config, size]
  );

  return (
    <div
      className={cn(
        "bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={avatarDataUri}
        alt="Avatar Preview"
        className="w-full h-full object-contain"
      />
    </div>
  );
}
