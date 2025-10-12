"use client";

import { cn } from "@/lib/utils";
import type {
  Flashcard as FlashcardType,
  ThesysJSON,
  Visualization,
  MermaidVisualization,
} from "@/lib/lesson.types";
import { MermaidVisualizationComponent } from "./mermaid-visualization";

type FlashcardProps = {
  flashcard: FlashcardType;
  isFlipped: boolean;
  onFlip: () => void;
};

/**
 * Einzelne Flashcard mit Flip-Animation
 *
 * - Vorderseite: Frage (großer Text, zentriert)
 * - Rückseite: Thesys-JSON-Visualisierung oder Fallback
 * - Neobrutalismus-Design (15px radius, retro colors, shadows)
 */
export function Flashcard({ flashcard, isFlipped, onFlip }: FlashcardProps) {
  return (
    <div
      className="relative w-full max-w-5xl cursor-pointer"
      onClick={onFlip}
      style={{ perspective: "1000px" }}
    >
      {/* Aspect Ratio Container (4:3) */}
      <div className="aspect-[4/3] relative">
        {/* Flip Container */}
        <div
          className={cn(
            "relative w-full h-full transition-transform duration-500",
            "transform-style-preserve-3d",
            isFlipped && "rotate-y-180"
          )}
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front (Frage) */}
          <div
            className="absolute inset-0 bg-white border-4 border-black rounded-[15px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 flex items-center justify-center"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <div className="text-center space-y-4">
              <p className="text-3xl md:text-4xl font-extrabold leading-tight">
                {flashcard.question}
              </p>
              <p className="text-sm font-medium text-foreground/50 mt-6">
                👆 Klicke zum Umdrehen
              </p>
            </div>
          </div>

          {/* Back (Antwort / Visualisierungen) */}
          <div
            className="absolute inset-0 bg-[#00D9BE] border-4 border-black rounded-[15px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 overflow-auto"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {/* Neues Visualisierungs-System */}
            {flashcard.visualizations && flashcard.visualizations.length > 0 ? (
              <VisualizationRenderer
                visualizations={flashcard.visualizations}
              />
            ) : flashcard.thesys_json ? (
              // Legacy Fallback für alte Flashcards
              <ThesysVisualization thesysJson={flashcard.thesys_json} />
            ) : (
              <PlainTextFallback question={flashcard.question} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Thesys/C1 Visualisierung
 * TODO: Später mit echter Thesys-Rendering-Library ersetzen
 */
function ThesysVisualization({ thesysJson }: { thesysJson: ThesysJSON }) {
  return (
    <div className="text-black space-y-4">
      <h3 className="text-2xl font-extrabold mb-4">📊 Konzept-Map</h3>

      {/* Nodes */}
      <div className="space-y-3">
        {thesysJson.nodes.map((node, idx) => (
          <div
            key={node.id || `node-${idx}`}
            className={cn(
              "p-4 border-4 border-black rounded-[15px] font-medium",
              node.type === "concept" && "bg-[#FFC667]",
              node.type === "detail" && "bg-white",
              node.type === "example" && "bg-[#FB7DA8]",
              node.type === "definition" && "bg-[#662CB7] text-white"
            )}
          >
            <span className="text-xs font-extrabold uppercase opacity-70 block mb-1">
              {node.type}
            </span>
            <p className="text-base font-extrabold">{node.label}</p>
          </div>
        ))}
      </div>

      {/* Edges (Verbindungen) */}
      {thesysJson.edges.length > 0 && (
        <div className="mt-6 pt-6 border-t-4 border-black/20">
          <h4 className="text-lg font-extrabold mb-3">🔗 Verbindungen</h4>
          <div className="space-y-2">
            {thesysJson.edges.map((edge, idx) => {
              const fromNode = thesysJson.nodes.find((n) => n.id === edge.from);
              const toNode = thesysJson.nodes.find((n) => n.id === edge.to);
              return (
                <div
                  key={`${edge.from}-${edge.to}-${edge.label || idx}`}
                  className="text-sm font-medium bg-black/10 rounded-[15px] p-3"
                >
                  <span className="font-extrabold">{fromNode?.label}</span>
                  <span className="mx-2 opacity-70">→ {edge.label} →</span>
                  <span className="font-extrabold">{toNode?.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renderer für alle Visualisierungen (Thesys + Mermaid)
 */
function VisualizationRenderer({
  visualizations,
}: {
  visualizations: Visualization[];
}) {
  return (
    <div className="text-black space-y-6">
      {visualizations.map((viz, idx) => (
        <div key={idx}>
          {viz.type === "thesys" ? (
            <ThesysVisualization thesysJson={viz.data as ThesysJSON} />
          ) : viz.type === "mermaid" ? (
            <MermaidVisualizationComponent
              mermaidData={viz.data as MermaidVisualization}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Fallback für Karten ohne Visualisierung
 */
function PlainTextFallback({ question }: { question: string }) {
  return (
    <div className="flex items-center justify-center h-full text-center text-black">
      <div>
        <p className="text-2xl font-extrabold mb-4">💡 Konzept</p>
        <p className="text-xl font-medium leading-relaxed">{question}</p>
        <p className="text-sm font-medium opacity-70 mt-6">
          Visualisierung wird noch geladen...
        </p>
      </div>
    </div>
  );
}
