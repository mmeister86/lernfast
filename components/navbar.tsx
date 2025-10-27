"use client";

import { useSession } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { UserAvatar } from "@/components/avatar/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  // Wenn kein User eingeloggt ist, zeige nichts an
  if (isPending || !session?.user) {
    return null;
  }

  // Extrahiere Initialen für Avatar-Fallback
  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  };

  const initials = getInitials(session.user.name, session.user.email);

  // [AVATAR-DEBUG] Log session raw customAvatarConfig
  console.log("[AVATAR-DEBUG] Navbar Session Raw:", {
    customAvatarConfig: session.user.customAvatarConfig,
    type: typeof session.user.customAvatarConfig,
    isString: typeof session.user.customAvatarConfig === "string",
    isObject:
      session.user.customAvatarConfig &&
      typeof session.user.customAvatarConfig === "object",
    preview:
      typeof session.user.customAvatarConfig === "string"
        ? session.user.customAvatarConfig.substring(0, 100)
        : JSON.stringify(session.user.customAvatarConfig)?.substring(0, 100),
  });

  // Parse customAvatarConfig from JSON string (Better-Auth stores as string)
  const avatarConfig = session.user.customAvatarConfig
    ? (() => {
        try {
          // If already an object, use it directly
          if (typeof session.user.customAvatarConfig === "object") {
            return session.user.customAvatarConfig;
          }
          // If string, parse it
          return JSON.parse(session.user.customAvatarConfig);
        } catch (e) {
          console.error("[AVATAR-DEBUG] Navbar Parse Error:", e);
          return null;
        }
      })()
    : null;

  // [AVATAR-DEBUG] Log parsed config
  console.log("[AVATAR-DEBUG] Navbar Parsed Config:", {
    avatarConfig,
    type: typeof avatarConfig,
    keys: avatarConfig ? Object.keys(avatarConfig) : null,
  });

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 ${
        pathname === "/"
          ? "bg-transparent"
          : "bg-background border-b-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo*/}
          <Link
            href="/"
            className="text-2xl font-heading text-foreground hover:opacity-80 transition-opacity"
          >
            lernfa.st
          </Link>

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none focus:ring-2 focus:ring-main focus:ring-offset-2 rounded-full">
              <UserAvatar
                userId={session.user.id}
                avatarConfig={avatarConfig}
                fallbackImage={session.user.image || undefined}
                fallbackInitials={initials}
                size="sm"
                className="size-10 shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
              />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-heading leading-none">
                    {session.user.name || "User"}
                  </p>
                  <p className="text-xs leading-none text-foreground/60">
                    {session.user.email}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer">
                  Dashboard
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="cursor-pointer">
                  Profil bearbeiten
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                Ausloggen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
