"use client";

import { cn } from "@/lib/utils";
import type {
  Flashcard as FlashcardType,
  ThesysJSON,
  Visualization,
  MermaidVisualization,
} from "@/lib/lesson.types";
import { useState, useEffect } from "react";
import mermaid from "mermaid";

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
      className="relative w-full max-w-2xl cursor-pointer"
      onClick={onFlip}
      style={{ perspective: "1000px" }}
    >
      {/* Aspect Ratio Container (3:4) */}
      <div className="aspect-[3/4] relative">
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
        {thesysJson.nodes.map((node) => (
          <div
            key={node.id}
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
                  key={idx}
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
 * Mermaid Visualisierungs-Komponente
 * Rendert SVG clientseitig im Browser mit mermaid.js
 */
function MermaidVisualizationComponent({
  mermaidData,
}: {
  mermaidData: MermaidVisualization;
}) {
  const [svg, setSvg] = useState<string | null>(mermaidData.svg || null);
  const [loading, setLoading] = useState(!mermaidData.svg);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Falls SVG gecached ist, verwende es direkt
    if (mermaidData.svg) {
      setSvg(mermaidData.svg);
      setLoading(false);
      return;
    }

    // Ansonsten: Rendere clientseitig mit mermaid.js
    const renderMermaid = async () => {
      try {
        setLoading(true);

        // Mermaid mit Neobrutalismus-Theme initialisieren
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          themeVariables: {
            primaryColor: "#FFC667", // Peach
            primaryTextColor: "#000000",
            primaryBorderColor: "#000000",
            lineColor: "#000000",
            secondaryColor: "#FB7DA8", // Pink
            tertiaryColor: "#00D9BE", // Teal
            background: "#ffffff",
            mainBkg: "#FFC667",
            secondBkg: "#FB7DA8",
            tertiaryBkg: "#00D9BE",
            nodeBorder: "#000000",
            clusterBkg: "#0CBCD7", // Blue
            clusterBorder: "#000000",
            titleColor: "#000000",
            edgeLabelBackground: "#ffffff",
            actorBorder: "#000000",
            actorBkg: "#FFC667",
            actorTextColor: "#000000",
            actorLineColor: "#000000",
            signalColor: "#000000",
            signalTextColor: "#000000",
            labelBoxBkgColor: "#ffffff",
            labelBoxBorderColor: "#000000",
            labelTextColor: "#000000",
            noteBackgroundColor: "#FFC667",
            noteBorderColor: "#000000",
            noteTextColor: "#000000",
          },
          fontFamily: "inherit",
          fontSize: 16,
        });

        // Eindeutige ID für dieses Diagramm
        const elementId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // SVG rendern
        const { svg: renderedSvg } = await mermaid.render(
          elementId,
          mermaidData.code
        );

        setSvg(renderedSvg);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      } finally {
        setLoading(false);
      }
    };

    renderMermaid();
  }, [mermaidData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-lg font-medium">Diagramm wird generiert...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#FC5A46] border-4 border-black rounded-[15px] p-6 text-white">
        <p className="font-extrabold text-lg mb-2">⚠️ Diagramm-Fehler</p>
        <p className="font-medium text-sm mb-3">{error}</p>
        <details className="text-xs font-medium opacity-80">
          <summary className="cursor-pointer">Code anzeigen</summary>
          <pre className="mt-2 p-2 bg-black/20 rounded overflow-x-auto">
            {mermaidData.code}
          </pre>
        </details>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="bg-white border-4 border-black rounded-[15px] p-6">
        <p className="font-medium text-black">
          Keine Visualisierung verfügbar.
        </p>
      </div>
    );
  }

  return (
    <div className="mermaid-container">
      <div
        className="bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
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
