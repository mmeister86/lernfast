import React, { type ReactNode } from "react";

// ============================================
// HELPER COMPONENTS FÜR STREAMING UI
// ============================================

export function DialogMessage({
  content,
  isComplete,
}: {
  content: string;
  isComplete?: boolean;
}) {
  return (
    <div className="mb-4">
      <div className="p-4 rounded-[15px] border-4 border-black bg-[#FFC667]">
        <p className="text-lg font-medium text-black">{content}</p>
      </div>
    </div>
  );
}

export function AssessmentLoading() {
  return (
    <div className="p-4 bg-[#FB7DA8] border-4 border-black rounded-[15px]">
      <p className="text-lg font-extrabold text-black">
        🧠 Analysiere dein Wissen...
      </p>
    </div>
  );
}

export function TransitionToStory({
  knowledgeLevel,
}: {
  knowledgeLevel: string;
}) {
  return (
    <div className="p-6 bg-gradient-to-br from-[#00D9BE] to-[#0CBCD7] border-4 border-black rounded-[15px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <p className="text-2xl font-extrabold text-black mb-2">
        ✅ Dialog abgeschlossen!
      </p>
      <p className="text-lg font-medium text-black">
        Dein Level: <strong>{knowledgeLevel}</strong>. Lass uns in die Story
        eintauchen!
      </p>
    </div>
  );
}

export function ChapterLoading({ title }: { title: string }) {
  return (
    <div className="p-6 bg-white border-4 border-black rounded-[15px]">
      <p className="text-xl font-extrabold mb-2">📖 {title}</p>
      <p className="text-lg font-medium text-gray-600">Erstelle Kapitel...</p>
    </div>
  );
}

export function QuestionLoading() {
  return (
    <div className="p-4 bg-[#662CB7] text-white border-4 border-black rounded-[15px]">
      <p className="text-lg font-extrabold">🎯 Generiere Frage...</p>
    </div>
  );
}

export function AdaptingDifficulty() {
  return (
    <div className="p-4 bg-[#FFC667] border-4 border-black rounded-[15px]">
      <p className="text-lg font-extrabold">
        ⚙️ Passe Schwierigkeitsgrad an...
      </p>
    </div>
  );
}
