"use client";

/**
 * Moderne Visualisierungs-Komponente mit Recharts + Framer Motion
 * Ersetzt D3.js mit einfacheren, wartbareren Charts
 */

import { motion } from "framer-motion";
import {
  LineChart,
  BarChart,
  PieChart,
  Line,
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Neobrutalismus Retro-Farben
const RETRO_COLORS = [
  "#FFC667", // Peach
  "#FB7DA8", // Pink
  "#00D9BE", // Teal
  "#662CB7", // Purple
  "#FC5A46", // Coral
  "#0CBCD7", // Blue
];

type VisualizationType = "timeline" | "comparison" | "process" | "concept-map";

interface VisualizationProps {
  type: VisualizationType;
  data: {
    title: string;
    chartData: any[];
  };
}

export function ModernVisualization({ type, data }: VisualizationProps) {
  // Validation
  if (!data || !data.chartData || data.chartData.length === 0) {
    console.error("❌ ModernVisualization: Invalid or empty data", {
      type,
      data,
    });
    return (
      <div className="bg-gray-100 border-4 border-black rounded-[15px] p-6 text-center">
        <p className="text-lg font-medium text-gray-600">
          ⚠️ Keine Visualisierungsdaten vorhanden
        </p>
      </div>
    );
  }

  console.log("🎨 ModernVisualization rendering:", {
    type,
    dataLength: data.chartData.length,
    chartData: data.chartData,
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6"
      style={{ minHeight: "450px" }}
    >
      <h3 className="text-2xl font-extrabold mb-4 text-black">{data.title}</h3>
      <ResponsiveContainer
        width="100%"
        height={400}
        initialDimension={{ width: 600, height: 400 }}
      >
        {type === "timeline" ? (
          <TimelineChart data={data.chartData} />
        ) : type === "comparison" ? (
          <ComparisonChart data={data.chartData} />
        ) : type === "process" ? (
          <ProcessChart data={data.chartData} />
        ) : (
          <ConceptMapChart data={data.chartData} />
        )}
      </ResponsiveContainer>
    </motion.div>
  );
}

// ============================================
// TIMELINE CHART (Line Chart)
// ============================================

function TimelineChart({ data }: { data: any[] }) {
  return (
    <LineChart data={data} width={600} height={400}>
      <CartesianGrid strokeWidth={3} stroke="#000" />
      <XAxis
        dataKey="name"
        stroke="#000"
        strokeWidth={2}
        style={{ fontWeight: 800, fontSize: 14 }}
      />
      <YAxis
        stroke="#000"
        strokeWidth={2}
        style={{ fontWeight: 800, fontSize: 14 }}
      />
      <Tooltip
        contentStyle={{
          border: "4px solid #000",
          borderRadius: "15px",
          fontWeight: 500,
          backgroundColor: "#fff",
        }}
      />
      <Legend wrapperStyle={{ fontWeight: 800 }} />
      <Line
        type="monotone"
        dataKey="value"
        stroke={RETRO_COLORS[0]}
        strokeWidth={4}
        dot={{ fill: RETRO_COLORS[0], strokeWidth: 2, r: 6 }}
      />
    </LineChart>
  );
}

// ============================================
// COMPARISON CHART (Bar Chart)
// ============================================

function ComparisonChart({ data }: { data: any[] }) {
  return (
    <BarChart data={data} width={600} height={400}>
      <CartesianGrid strokeWidth={3} stroke="#000" />
      <XAxis
        dataKey="name"
        stroke="#000"
        strokeWidth={2}
        style={{ fontWeight: 800, fontSize: 14 }}
      />
      <YAxis
        stroke="#000"
        strokeWidth={2}
        style={{ fontWeight: 800, fontSize: 14 }}
      />
      <Tooltip
        contentStyle={{
          border: "4px solid #000",
          borderRadius: "15px",
          fontWeight: 500,
          backgroundColor: "#fff",
        }}
      />
      <Legend wrapperStyle={{ fontWeight: 800 }} />
      <Bar dataKey="value" fill={RETRO_COLORS[0]} stroke="#000" strokeWidth={2}>
        {data.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={RETRO_COLORS[index % RETRO_COLORS.length]}
          />
        ))}
      </Bar>
    </BarChart>
  );
}

// ============================================
// PROCESS CHART (Horizontal Bar Chart)
// ============================================

function ProcessChart({ data }: { data: any[] }) {
  return (
    <BarChart data={data} layout="horizontal" width={600} height={400}>
      <CartesianGrid strokeWidth={3} stroke="#000" />
      <XAxis
        type="number"
        stroke="#000"
        strokeWidth={2}
        style={{ fontWeight: 800, fontSize: 14 }}
      />
      <YAxis
        type="category"
        dataKey="name"
        stroke="#000"
        strokeWidth={2}
        style={{ fontWeight: 800, fontSize: 14 }}
        width={150}
      />
      <Tooltip
        contentStyle={{
          border: "4px solid #000",
          borderRadius: "15px",
          fontWeight: 500,
          backgroundColor: "#fff",
        }}
      />
      <Bar dataKey="value" fill={RETRO_COLORS[2]} stroke="#000" strokeWidth={2}>
        {data.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={RETRO_COLORS[index % RETRO_COLORS.length]}
          />
        ))}
      </Bar>
    </BarChart>
  );
}

// ============================================
// CONCEPT MAP (Pie Chart)
// ============================================

function ConceptMapChart({ data }: { data: any[] }) {
  return (
    <PieChart width={600} height={400}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={150}
        stroke="#000"
        strokeWidth={3}
        label={(props: any) => {
          const { name, percent } = props;
          return `${name}: ${((percent as number) * 100).toFixed(0)}%`;
        }}
        labelLine={false}
      >
        {data.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={RETRO_COLORS[index % RETRO_COLORS.length]}
          />
        ))}
      </Pie>
      <Tooltip
        contentStyle={{
          border: "4px solid #000",
          borderRadius: "15px",
          fontWeight: 500,
          backgroundColor: "#fff",
        }}
      />
      <Legend wrapperStyle={{ fontWeight: 800 }} />
    </PieChart>
  );
}
