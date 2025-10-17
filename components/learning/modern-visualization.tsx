"use client";

/**
 * Moderne Visualisierungs-Komponente mit Recharts + Framer Motion
 * Ersetzt D3.js mit einfacheren, wartbareren Charts
 */

import { useState, useEffect } from "react";
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

// ============================================
// ERROR FALLBACK COMPONENT
// ============================================

interface ErrorFallbackProps {
  title: string;
  message: string;
  severity: "error" | "warning" | "info";
}

function ErrorFallback({ title, message, severity }: ErrorFallbackProps) {
  const bgColor =
    severity === "error"
      ? "bg-red-100"
      : severity === "warning"
      ? "bg-yellow-100"
      : "bg-gray-100";

  const textColor =
    severity === "error"
      ? "text-red-600"
      : severity === "warning"
      ? "text-yellow-700"
      : "text-gray-700";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`${bgColor} border-4 border-black rounded-[15px] p-6 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}
    >
      <p className={`text-lg font-extrabold ${textColor}`}>⚠️ {title}</p>
      <p className="text-sm text-gray-600 mt-2">{message}</p>
    </motion.div>
  );
}

interface VisualizationProps {
  type: VisualizationType;
  data: {
    title: string;
    chartData: any[];
  };
}

export function ModernVisualization({ type, data }: VisualizationProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Simuliere Chart-Rendering-Zeit
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300); // Kurze Verzögerung für smooth transition

    return () => clearTimeout(timer);
  }, []);

  // Detaillierte Validierung mit spezifischen Fehlermeldungen
  if (!data) {
    console.error("❌ ModernVisualization: data prop is undefined/null");
    return (
      <ErrorFallback
        title="Visualisierung fehlt komplett"
        message="Bitte kontaktiere den Support mit diesem Fehler."
        severity="error"
      />
    );
  }

  if (!data.chartData) {
    console.error("❌ ModernVisualization: chartData property is missing", {
      type,
      dataKeys: Object.keys(data),
    });
    return (
      <ErrorFallback
        title="Chart-Daten fehlen"
        message={`Typ: ${type} | Titel: ${data.title || "Unbekannt"}`}
        severity="warning"
      />
    );
  }

  if (!Array.isArray(data.chartData) || data.chartData.length === 0) {
    console.error("❌ ModernVisualization: chartData is empty or not an array", {
      type,
      isArray: Array.isArray(data.chartData),
      length: data.chartData?.length,
      chartData: data.chartData,
    });
    return (
      <ErrorFallback
        title="Keine Daten für Visualisierung"
        message={`Typ: ${type} | Titel: ${data.title || "Unbekannt"}`}
        severity="info"
      />
    );
  }

  // Success-Logging
  console.log("🎨 ModernVisualization rendering successfully:", {
    type,
    title: data.title,
    dataLength: data.chartData.length,
    firstItem: data.chartData[0],
  });

  // Loading State während Chart rendert
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6"
        style={{ minHeight: "450px" }}
      >
        <h3 className="text-2xl font-extrabold mb-4 text-black">{data.title}</h3>
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-6xl mx-auto"
            >
              📊
            </motion.div>
            <p className="text-lg font-medium text-gray-600">
              Visualisierung wird geladen...
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-white border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 md:p-6"
      style={{ minHeight: "450px" }}
    >
      <h3 className="text-xl md:text-2xl font-extrabold mb-4 text-black">
        {data.title}
      </h3>
      <div className="w-full overflow-x-auto">
        <ResponsiveContainer
          width="100%"
          height={400}
          minWidth={300}
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
      </div>
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
        style={{ fontWeight: 800, fontSize: 12 }}
        angle={-45}
        textAnchor="end"
        height={80}
      />
      <YAxis
        stroke="#000"
        strokeWidth={2}
        style={{ fontWeight: 800, fontSize: 12 }}
      />
      <Tooltip
        contentStyle={{
          border: "4px solid #000",
          borderRadius: "15px",
          fontWeight: 500,
          backgroundColor: "#fff",
        }}
      />
      <Legend wrapperStyle={{ fontWeight: 800, fontSize: 12 }} />
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
        style={{ fontWeight: 800, fontSize: 12 }}
        angle={-45}
        textAnchor="end"
        height={80}
      />
      <YAxis
        stroke="#000"
        strokeWidth={2}
        style={{ fontWeight: 800, fontSize: 12 }}
      />
      <Tooltip
        contentStyle={{
          border: "4px solid #000",
          borderRadius: "15px",
          fontWeight: 500,
          backgroundColor: "#fff",
        }}
      />
      <Legend wrapperStyle={{ fontWeight: 800, fontSize: 12 }} />
      <Bar dataKey="value" fill={RETRO_COLORS[0]} stroke="#000" strokeWidth={2}>
        {data.map((_, index) => (
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
  // Validierung: Prüfe ob Daten vorhanden sind
  if (!data || data.length === 0) {
    console.error("❌ ProcessChart: Keine Daten vorhanden");
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg font-medium text-gray-500">
          Keine Prozess-Daten verfügbar
        </p>
      </div>
    );
  }

  // Debug-Logging
  console.log("📊 ProcessChart rendering:", {
    dataLength: data.length,
    sampleData: data[0],
  });

  return (
    <BarChart data={data} layout="horizontal">
      <CartesianGrid strokeWidth={3} stroke="#000" />
      <XAxis
        type="number"
        stroke="#000"
        strokeWidth={2}
        style={{ fontWeight: 800, fontSize: 12 }}
        domain={[0, 100]}
      />
      <YAxis
        type="category"
        dataKey="name"
        stroke="#000"
        strokeWidth={2}
        style={{ fontWeight: 800, fontSize: 10 }}
        width={120}
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
        {data.map((_, index) => (
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
        {data.map((_, index) => (
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
