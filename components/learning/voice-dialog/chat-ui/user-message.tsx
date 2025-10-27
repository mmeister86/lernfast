"use client";

import { UserAvatar } from "@/components/avatar/user-avatar";
import { useSession } from "@/lib/auth-client";

interface UserMessageProps {
  content: string;
  variant?: "voice" | "text";
}

export function UserMessage({ content, variant = "voice" }: UserMessageProps) {
  const { data: session } = useSession();

  return (
    <div className="flex gap-3 justify-end items-start">
      <div className="max-w-[80%] p-4 bg-[#00D9BE] border-4 border-black rounded-[15px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-lg font-medium text-black">{content}</p>
      </div>
      {session?.user && (
        <UserAvatar
          userId={session.user.id}
          avatarConfig={session.user.customAvatarConfig as any}
          size="sm"
          className="w-12 h-12 flex-shrink-0"
        />
      )}
    </div>
  );
}
