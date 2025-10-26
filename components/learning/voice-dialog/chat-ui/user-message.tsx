"use client";

interface UserMessageProps {
  content: string;
  variant?: "voice" | "text";
}

export function UserMessage({ content, variant = "voice" }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] p-4 bg-[#00D9BE] border-4 border-black rounded-[15px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-lg font-medium text-black">{content}</p>
      </div>
    </div>
  );
}
