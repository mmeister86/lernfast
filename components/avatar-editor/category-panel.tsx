"use client";

import { AvatarOptionCard } from "./avatar-option-card";

interface CategoryPanelProps {
  title: string;
  options: readonly string[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  canBeEmpty?: boolean;
}

export function CategoryPanel({
  title,
  options,
  selectedValue,
  onSelect,
  canBeEmpty = true,
}: CategoryPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-extrabold text-foreground">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {canBeEmpty && (
          <AvatarOptionCard
            label="Keine"
            isSelected={selectedValue === undefined}
            onClick={() => onSelect(undefined as any)}
          />
        )}
        {options.map((option) => (
          <AvatarOptionCard
            key={option}
            label={option}
            isSelected={selectedValue === option}
            onClick={() => onSelect(option)}
          />
        ))}
      </div>
    </div>
  );
}
