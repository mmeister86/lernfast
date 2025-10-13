"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { D3Visualization, D3Node, D3Link } from "@/lib/lesson.types";

type D3VisualizationComponentProps = {
  visualization: D3Visualization;
};

/**
 * D3.js Visualization Component für interaktive Graph-Darstellungen
 *
 * Unterstützte Layouts:
 * - Force-Directed: Interaktive Concept Maps mit freier Anordnung
 * - Hierarchical: Top-Down Tree-Strukturen
 * - Radial: Zentrale Konzepte mit radialen Verbindungen
 * - Cluster: Gruppierte Themen-Kategorien
 *
 * Features:
 * - Drag & Drop für Nodes (bei Force-Directed)
 * - Neobrutalismus-Design (Retro Palette, 4px borders, 15px radius)
 * - Responsive SVG (viewBox scaling)
 */
export function D3VisualizationComponent({
  visualization,
}: D3VisualizationComponentProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove();

    const { layout, nodes, links, config } = visualization;
    const width = config?.width || 800;
    const height = config?.height || 600;

    // SVG Setup mit Neobrutalismus-Styling
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // Layout-spezifisches Rendering
    if (layout === "force-directed") {
      renderForceDirected(svg, nodes, links, width, height, config);
    } else if (layout === "hierarchical") {
      renderHierarchical(svg, nodes, links, width, height, config);
    } else if (layout === "radial") {
      renderRadial(svg, nodes, links, width, height, config);
    } else if (layout === "cluster") {
      renderCluster(svg, nodes, links, width, height, config);
    }
  }, [visualization]);

  return (
    <div
      ref={containerRef}
      className="bg-white border-4 border-black rounded-[15px] p-4 overflow-hidden"
    >
      <h3 className="text-xl font-extrabold mb-4 text-black">
        📊 Interaktive Visualisierung
      </h3>
      <svg ref={svgRef} className="w-full h-auto" />
      <p className="text-xs font-medium text-black/50 mt-2">
        💡 Tipp: Bei Force-Directed Layouts kannst du Nodes verschieben!
      </p>
    </div>
  );
}

/**
 * Force-Directed Graph Implementation
 * Interaktive Concept Maps mit physik-basierter Anordnung
 */
function renderForceDirected(
  svg: any,
  nodes: D3Node[],
  links: D3Link[],
  width: number,
  height: number,
  config: any
) {
  const nodeRadius = config?.nodeRadius || 40;
  const linkDistance = config?.linkDistance || 100;

  // Clone data to avoid mutation
  const nodeData = nodes.map((d) => ({ ...d }));
  const linkData = links.map((d) => ({ ...d }));

  // D3 Force Simulation
  const simulation = d3
    .forceSimulation(nodeData as any)
    .force(
      "link",
      d3
        .forceLink(linkData as any)
        .id((d: any) => d.id)
        .distance(linkDistance)
    )
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide(nodeRadius + 10));

  // Links (Edges) mit Labels
  const linkGroup = svg.append("g").attr("class", "links");

  const link = linkGroup
    .selectAll("line")
    .data(linkData)
    .join("line")
    .attr("stroke", "#000000")
    .attr("stroke-width", 4);

  // Link Labels (optional, wenn Label vorhanden)
  const linkLabel = linkGroup
    .selectAll("text")
    .data(linkData.filter((d: any) => d.label))
    .join("text")
    .attr("font-size", "10px")
    .attr("font-weight", "600")
    .attr("fill", "#000000")
    .attr("text-anchor", "middle")
    .attr("dy", -5)
    .text((d: any) => d.label);

  // Nodes
  const nodeGroup = svg.append("g").attr("class", "nodes");

  const node = nodeGroup
    .selectAll("g")
    .data(nodeData)
    .join("g")
    .call(drag(simulation) as any);

  // Node Circles mit Neobrutalismus-Farben
  node
    .append("circle")
    .attr("r", nodeRadius)
    .attr("fill", (d: any) => getNodeColor(d.type, d.color))
    .attr("stroke", "#000000")
    .attr("stroke-width", 4);

  // Node Labels (Text in Circle)
  node
    .append("text")
    .text((d: any) => d.label)
    .attr("text-anchor", "middle")
    .attr("dy", "0.3em")
    .attr("font-size", "12px")
    .attr("font-weight", "800")
    .attr("fill", (d: any) => (d.type === "definition" ? "#FFFFFF" : "#000000"))
    .style("pointer-events", "none")
    .each(function (d: any) {
      // Wrap text if too long
      const text = d3.select(this);
      const words = d.label.split(/\s+/);
      if (words.length > 2) {
        text.text("");
        text
          .append("tspan")
          .attr("x", 0)
          .attr("dy", "-0.3em")
          .text(words.slice(0, 2).join(" "));
        text
          .append("tspan")
          .attr("x", 0)
          .attr("dy", "1em")
          .text(words.slice(2).join(" "));
      }
    });

  // Update positions on simulation tick
  simulation.on("tick", () => {
    link
      .attr("x1", (d: any) => d.source.x)
      .attr("y1", (d: any) => d.source.y)
      .attr("x2", (d: any) => d.target.x)
      .attr("y2", (d: any) => d.target.y);

    linkLabel
      .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
      .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

    node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
  });
}

/**
 * Hierarchical Tree Layout
 * Top-Down Strukturen für Prozess-Flows
 */
function renderHierarchical(
  svg: any,
  nodes: D3Node[],
  links: D3Link[],
  width: number,
  height: number,
  config: any
) {
  const nodeRadius = config?.nodeRadius || 30;

  // Convert flat nodes/links to hierarchical structure
  const hierarchy = buildHierarchy(nodes, links);

  const treeLayout = d3.tree().size([width - 100, height - 100]);
  const root = d3.hierarchy(hierarchy);
  treeLayout(root);

  // Links
  svg
    .append("g")
    .attr("transform", "translate(50, 50)")
    .selectAll("path")
    .data(root.links())
    .join("path")
    .attr("fill", "none")
    .attr("stroke", "#000000")
    .attr("stroke-width", 4)
    .attr(
      "d",
      d3
        .linkVertical()
        .x((d: any) => d.x)
        .y((d: any) => d.y) as any
    );

  // Nodes
  const node = svg
    .append("g")
    .attr("transform", "translate(50, 50)")
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr("transform", (d: any) => `translate(${d.x},${d.y})`);

  node
    .append("circle")
    .attr("r", nodeRadius)
    .attr("fill", (d: any) => getNodeColor(d.data.type, d.data.color))
    .attr("stroke", "#000000")
    .attr("stroke-width", 4);

  node
    .append("text")
    .text((d: any) => d.data.label)
    .attr("text-anchor", "middle")
    .attr("dy", "0.3em")
    .attr("font-size", "11px")
    .attr("font-weight", "800")
    .attr("fill", (d: any) =>
      d.data.type === "definition" ? "#FFFFFF" : "#000000"
    );
}

/**
 * Radial Layout
 * Zentrale Konzepte mit radialen Verbindungen
 */
function renderRadial(
  svg: any,
  nodes: D3Node[],
  links: D3Link[],
  width: number,
  height: number,
  config: any
) {
  const nodeRadius = config?.nodeRadius || 30;

  // Build hierarchy for radial layout
  const hierarchy = buildHierarchy(nodes, links);
  const root = d3.hierarchy(hierarchy);

  const treeLayout = d3
    .tree()
    .size([2 * Math.PI, Math.min(width, height) / 2 - 100])
    .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

  treeLayout(root);

  // Center point
  const centerX = width / 2;
  const centerY = height / 2;

  // Links (radial)
  svg
    .append("g")
    .attr("transform", `translate(${centerX}, ${centerY})`)
    .selectAll("path")
    .data(root.links())
    .join("path")
    .attr("fill", "none")
    .attr("stroke", "#000000")
    .attr("stroke-width", 3)
    .attr(
      "d",
      d3
        .linkRadial()
        .angle((d: any) => d.x)
        .radius((d: any) => d.y) as any
    );

  // Nodes (radial)
  const node = svg
    .append("g")
    .attr("transform", `translate(${centerX}, ${centerY})`)
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr(
      "transform",
      (d: any) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`
    );

  node
    .append("circle")
    .attr("r", nodeRadius)
    .attr("fill", (d: any) => getNodeColor(d.data.type, d.data.color))
    .attr("stroke", "#000000")
    .attr("stroke-width", 4);

  node
    .append("text")
    .text((d: any) => d.data.label)
    .attr("font-size", "10px")
    .attr("font-weight", "800")
    .attr("fill", (d: any) =>
      d.data.type === "definition" ? "#FFFFFF" : "#000000"
    )
    .attr("text-anchor", (d: any) =>
      d.x < Math.PI === !d.children ? "start" : "end"
    )
    .attr("transform", (d: any) => (d.x >= Math.PI ? "rotate(180)" : null))
    .attr("x", (d: any) => (d.x < Math.PI === !d.children ? 6 : -6));
}

/**
 * Cluster Layout
 * Gruppierte Themen-Kategorien
 */
function renderCluster(
  svg: any,
  nodes: D3Node[],
  links: D3Link[],
  width: number,
  height: number,
  config: any
) {
  const nodeRadius = config?.nodeRadius || 25;

  // Build hierarchy
  const hierarchy = buildHierarchy(nodes, links);
  const root = d3.hierarchy(hierarchy);

  const clusterLayout = d3.cluster().size([width - 100, height - 100]);
  clusterLayout(root);

  // Links
  svg
    .append("g")
    .attr("transform", "translate(50, 50)")
    .selectAll("path")
    .data(root.links())
    .join("path")
    .attr("fill", "none")
    .attr("stroke", "#000000")
    .attr("stroke-width", 3)
    .attr(
      "d",
      d3
        .linkVertical()
        .x((d: any) => d.x)
        .y((d: any) => d.y) as any
    );

  // Nodes
  const node = svg
    .append("g")
    .attr("transform", "translate(50, 50)")
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr("transform", (d: any) => `translate(${d.x},${d.y})`);

  node
    .append("circle")
    .attr("r", nodeRadius)
    .attr("fill", (d: any) => getNodeColor(d.data.type, d.data.color))
    .attr("stroke", "#000000")
    .attr("stroke-width", 4);

  node
    .append("text")
    .text((d: any) => d.data.label)
    .attr("text-anchor", "middle")
    .attr("dy", "0.3em")
    .attr("font-size", "10px")
    .attr("font-weight", "800")
    .attr("fill", (d: any) =>
      d.data.type === "definition" ? "#FFFFFF" : "#000000"
    );
}

/**
 * Helper: Build hierarchical structure from flat nodes/links
 */
function buildHierarchy(nodes: D3Node[], links: D3Link[]): any {
  const nodeMap = new Map(
    nodes.map((n) => [n.id, { ...n, children: [] as any[] }])
  );

  // Find root (node with no incoming links)
  const targetIds = new Set(links.map((l) => l.target));
  const rootNode = nodes.find((n) => !targetIds.has(n.id)) || nodes[0];

  links.forEach((link) => {
    const parent = nodeMap.get(link.source);
    const child = nodeMap.get(link.target);
    if (parent && child) {
      parent.children.push(child);
    }
  });

  return nodeMap.get(rootNode.id) || nodeMap.values().next().value;
}

/**
 * Drag Behavior für Force-Directed Graphs
 */
function drag(simulation: any) {
  return d3
    .drag()
    .on("start", (event: any, d: any) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on("drag", (event: any, d: any) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on("end", (event: any, d: any) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });
}

/**
 * Node-Color Mapping (Neobrutalismus Retro Palette)
 */
function getNodeColor(type: string, customColor?: string): string {
  if (customColor) return customColor;

  switch (type) {
    case "concept":
      return "#FFC667"; // Peach - Hauptkonzepte
    case "detail":
      return "#FFFFFF"; // White - Details
    case "example":
      return "#FB7DA8"; // Pink - Beispiele
    case "definition":
      return "#662CB7"; // Purple - Definitionen
    default:
      return "#00D9BE"; // Teal - Fallback
  }
}
