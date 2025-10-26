"use client";

import { Button } from "@/components/ui/button";

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <div className="space-y-6">
      <div className="bg-[#FC5A46] border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
        <h2 className="text-2xl font-extrabold text-white mb-3">⚠️ Fehler</h2>
        <p className="text-lg font-medium text-white mb-4">{error}</p>
        <Button
          onClick={onRetry}
          className="bg-white text-[#FC5A46] hover:bg-gray-100"
        >
          Erneut versuchen
        </Button>
      </div>
    </div>
  );
}
