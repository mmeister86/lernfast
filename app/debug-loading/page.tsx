"use client";

import { useState } from "react";
import { LoadingModal } from "@/components/loading-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type LoadingPhase = "analyzing" | "generating" | "finalizing";

/**
 * Debug-Seite für das Hamster-Loading-Modal
 *
 * Ermöglicht das Testen aller Phasen ohne KI-Workflow.
 * Nützlich für Design-Entwicklung und Animation-Testing.
 */
export default function DebugLoadingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<LoadingPhase>("analyzing");

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handlePhaseChange = (phase: LoadingPhase) => {
    setCurrentPhase(phase);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-foreground">
            🐹 Hamster Loading Modal Debug
          </h1>
          <p className="text-lg font-medium text-foreground/70">
            Teste alle Phasen des Loading-Modals ohne KI-Workflow
          </p>
        </div>

        {/* Control Panel */}
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold">Modal Controls</h2>

            {/* Phase Selection */}
            <div className="space-y-3">
              <label className="text-lg font-medium">Aktuelle Phase:</label>
              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={() => handlePhaseChange("analyzing")}
                  variant={currentPhase === "analyzing" ? "default" : "outline"}
                  className="flex items-center gap-2"
                >
                  🔍 Analyzing
                </Button>
                <Button
                  onClick={() => handlePhaseChange("generating")}
                  variant={
                    currentPhase === "generating" ? "default" : "outline"
                  }
                  className="flex items-center gap-2"
                >
                  ✨ Generating
                </Button>
                <Button
                  onClick={() => handlePhaseChange("finalizing")}
                  variant={
                    currentPhase === "finalizing" ? "default" : "outline"
                  }
                  className="flex items-center gap-2"
                >
                  🎉 Finalizing
                </Button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="space-y-3">
              <label className="text-lg font-medium">Modal Actions:</label>
              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={handleOpenModal}
                  disabled={isModalOpen}
                  className="bg-[#00D9BE] hover:bg-[#00D9BE]/90"
                >
                  🚀 Modal öffnen
                </Button>
                <Button
                  onClick={handleCloseModal}
                  disabled={!isModalOpen}
                  variant="coral"
                >
                  ❌ Modal schließen
                </Button>
              </div>
            </div>

            {/* Current Status */}
            <div className="space-y-2">
              <label className="text-lg font-medium">Status:</label>
              <div className="p-4 bg-gray-50 border-4 border-black rounded-[15px]">
                <p className="font-medium">
                  Modal:{" "}
                  <span
                    className={isModalOpen ? "text-green-600" : "text-red-600"}
                  >
                    {isModalOpen ? "Geöffnet" : "Geschlossen"}
                  </span>
                </p>
                <p className="font-medium">
                  Phase: <span className="text-[#662CB7]">{currentPhase}</span>
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Test Instructions */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-extrabold">Test-Anweisungen</h2>
          <div className="space-y-3 text-base font-medium">
            <p>
              1. <strong>Phase auswählen:</strong> Klicke auf eine der drei
              Phasen-Buttons
            </p>
            <p>
              2. <strong>Modal öffnen:</strong> Klicke "Modal öffnen" um den
              Hamster zu sehen
            </p>
            <p>
              3. <strong>Text-Wechsel beobachten:</strong> Die humorvollen Texte
              wechseln alle 5,5 Sekunden
            </p>
            <p>
              4. <strong>Phase wechseln:</strong> Du kannst die Phase ändern,
              während das Modal offen ist
            </p>
            <p>
              5. <strong>Animationen testen:</strong> Rad dreht sich, Hamster
              läuft, Beine bewegen sich
            </p>
          </div>
        </Card>

        {/* Phase Messages Preview */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-extrabold">
            Verfügbare Texte pro Phase
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Analyzing */}
            <div className="space-y-3">
              <h3 className="text-lg font-extrabold text-[#FFC667]">
                🔍 Analyzing
              </h3>
              <ul className="space-y-2 text-sm font-medium">
                <li>• "Der Hamster analysiert fleißig dein Thema..."</li>
                <li>• "🐹 Hmm, interessant!"</li>
                <li>• "Der kleine Denker dreht seine Runden..."</li>
                <li>• "Wissen wird durchforstet..."</li>
                <li>• "🔍 Aha! Das wird gut!"</li>
              </ul>
            </div>

            {/* Generating */}
            <div className="space-y-3">
              <h3 className="text-lg font-extrabold text-[#FB7DA8]">
                ✨ Generating
              </h3>
              <ul className="space-y-2 text-sm font-medium">
                <li>• "Die Lernkarten werden erschaffen..."</li>
                <li>• "🎨 Der Hamster malt Mindmaps!"</li>
                <li>• "Wissen wird in mundgerechte Häppchen verpackt..."</li>
                <li>• "Kreativität im Hamsterrad!"</li>
                <li>• "💡 Gleich hast du's schwarz auf weiß!"</li>
              </ul>
            </div>

            {/* Finalizing */}
            <div className="space-y-3">
              <h3 className="text-lg font-extrabold text-[#00D9BE]">
                🎉 Finalizing
              </h3>
              <ul className="space-y-2 text-sm font-medium">
                <li>• "Fast geschafft!"</li>
                <li>• "🏁 Der Endspurt läuft!"</li>
                <li>• "Letzte Kontrolle... Sieht gut aus!"</li>
                <li>• "Der Hamster macht den Feinschliff..."</li>
                <li>• "✨ Gleich kann's losgehen!"</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Back to Home */}
        <div className="text-center">
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
            size="lg"
          >
            ← Zurück zur Startseite
          </Button>
        </div>
      </div>

      {/* Loading Modal */}
      <LoadingModal isOpen={isModalOpen} phase={currentPhase} />
    </div>
  );
}
