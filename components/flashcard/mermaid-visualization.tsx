"use client";

import { useState, useEffect } from "react";
import mermaid from "mermaid";
import type { MermaidVisualization } from "@/lib/lesson.types";
import { sanitizeMermaidCode } from "@/lib/utils";

type MermaidVisualizationComponentProps = {
  mermaidData: MermaidVisualization;
};

/**
 * Mermaid Visualisierungs-Komponente (CLIENT-ONLY)
 * Rendert SVG clientseitig im Browser mit mermaid.js
 *
 * WICHTIG: Diese Component MUSS "use client" haben, da mermaid.js
 * Browser-APIs nutzt und nicht serverseitig gerendert werden kann.
 */
export function MermaidVisualizationComponent({
  mermaidData,
}: MermaidVisualizationComponentProps) {
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
          fontSize: 18, // Größere Schrift für bessere Lesbarkeit
          flowchart: {
            // Optimiert für bessere Textdarstellung
            nodeSpacing: 100,
            rankSpacing: 120,
            curve: "basis",
            padding: 25,
            htmlLabels: true,
            useMaxWidth: true,
            diagramPadding: 30,
          },
          mindmap: {
            maxNodeWidth: 200,
            padding: 20,
          },
          sequence: {
            diagramMarginX: 60,
            diagramMarginY: 30,
            actorMargin: 60,
            width: 180,
            height: 75,
            boxMargin: 15,
            boxTextMargin: 8,
            noteMargin: 15,
            messageMargin: 40,
            messageAlign: "center",
            mirrorActors: true,
            bottomMarginAdj: 1,
            useMaxWidth: true,
            rightAngles: false,
            showSequenceNumbers: false,
            wrap: true,
          },
          // Erhöhte Mindest-Breite für bessere Textdarstellung
          maxTextSize: 500000,
          wrap: true, // Globales Text-Wrapping aktivieren
        });

        // Eindeutige ID für dieses Diagramm
        const elementId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Sanitize Mermaid-Code (konvertiert \n zu echten Newlines, escaped Special Chars)
        const sanitizedCode = sanitizeMermaidCode(mermaidData.code);

        // SVG rendern mit sanitiertem Code
        const { svg: renderedSvg } = await mermaid.render(
          elementId,
          sanitizedCode
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
          <summary className="cursor-pointer">
            Sanitierter Code anzeigen
          </summary>
          <pre className="mt-2 p-2 bg-black/20 rounded overflow-x-auto whitespace-pre-wrap">
            {sanitizeMermaidCode(mermaidData.code)}
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
    <div className="mermaid-container w-full">
      <div
        className="bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {/* CSS für bessere Mermaid-Darstellung */}
      <style jsx>{`
        .mermaid-container :global(svg) {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0 auto;
          font-family: inherit;
        }

        /* Knoten-Größen und Text-Handling */
        .mermaid-container :global(.node rect),
        .mermaid-container :global(.node circle),
        .mermaid-container :global(.node ellipse),
        .mermaid-container :global(.node polygon),
        .mermaid-container :global(.node path) {
          min-width: fit-content !important;
          width: auto !important;
          height: auto !important;
          padding: 12px 16px !important;
          stroke-width: 4px !important;
          stroke: #000000 !important;
        }

        /* Text in Knoten */
        .mermaid-container :global(.nodeLabel),
        .mermaid-container :global(.label),
        .mermaid-container :global(text) {
          font-size: 18px !important;
          font-weight: 800 !important;
          font-family: inherit !important;
          text-anchor: middle !important;
          dominant-baseline: middle !important;
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }

        /* Edge Labels (Verbindungstexte) */
        .mermaid-container :global(.edgeLabel) {
          font-size: 16px !important;
          font-weight: 700 !important;
          background: white !important;
          padding: 6px 10px !important;
          border-radius: 8px !important;
          border: 3px solid black !important;
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
        }

        /* Mindmap-spezifische Styles */
        .mermaid-container :global(.mindmap-node) {
          min-width: 120px !important;
          min-height: 40px !important;
          padding: 10px 15px !important;
        }

        /* Flowchart-spezifische Styles */
        .mermaid-container :global(.flowchart-node) {
          min-width: 100px !important;
          min-height: 35px !important;
        }

        /* Sequence Diagram Styles */
        .mermaid-container :global(.actor) {
          min-width: 120px !important;
          min-height: 60px !important;
        }

        /* Allgemeine Text-Overflow-Behandlung */
        .mermaid-container :global(.node text),
        .mermaid-container :global(text) {
          overflow: visible !important;
          text-overflow: unset !important;
        }

        /* Responsive Anpassungen */
        @media (max-width: 768px) {
          .mermaid-container :global(.nodeLabel),
          .mermaid-container :global(.label),
          .mermaid-container :global(text) {
            font-size: 16px !important;
          }
          .mermaid-container :global(.edgeLabel) {
            font-size: 14px !important;
          }
        }
      `}</style>
    </div>
  );
}
