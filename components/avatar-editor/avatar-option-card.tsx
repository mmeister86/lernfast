"use client";

import { cn } from "@/lib/utils";

interface AvatarOptionCardProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function AvatarOptionCard({
  label,
  isSelected,
  onClick,
  className,
  children,
}: AvatarOptionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-4 rounded-[15px] border-4 border-black transition-all duration-100 cursor-pointer",
        "hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]",
        isSelected
          ? "bg-[#00D9BE] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
        className
      )}
    >
      <span className="font-medium text-sm capitalize">{label}</span>
      {children && <div className="mt-2">{children}</div>}
    </button>
  );
}
