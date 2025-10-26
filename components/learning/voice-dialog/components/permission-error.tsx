"use client";

import { Button } from "@/components/ui/button";

export function PermissionError() {
  return (
    <div className="space-y-6">
      <div className="bg-[#FC5A46] border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
        <h2 className="text-2xl font-extrabold text-white mb-3">
          🎤 Mikrofon-Zugriff erforderlich
        </h2>
        <p className="text-lg font-medium text-white mb-4">
          Für die Sprachsteuerung benötigen wir Zugriff auf dein Mikrofon.
        </p>
        <div className="space-y-3">
          <p className="text-base font-medium text-white">
            1. Klicke auf "Mikrofon erlauben" in deinem Browser
          </p>
          <p className="text-base font-medium text-white">
            2. Lade die Seite neu
          </p>
          <p className="text-base font-medium text-white">
            3. Oder nutze die Text-Eingabe als Alternative
          </p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          className="mt-4 bg-white text-[#FC5A46] hover:bg-gray-100"
        >
          Seite neu laden
        </Button>
      </div>
    </div>
  );
}
