"use client";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area,
} from "recharts";
import { SCurveData } from "@/lib/api";

// Normalise any date string → "YYYY-MM" regardless of backend padding
function toYM(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (!isNaN(d.getTime()))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  // fallback: already "YYYY-MM" or "YYYY-M"
  const [y, m] = raw.split("-");
  return `${y}-${String(m).padStart(2, "0")}`;
}


export default function SCurve({ data }: { data: SCurveData }) {
  const ddStr = toYM(data.data_date ?? "");

  const allPoints = data.labels.map((label, i) => ({
    label:    toYM(label),
    Baseline: data.baseline[i]  ?? null,
    Actual:   (data.actual[i]   ?? 0) > 0 ? data.actual[i]   : null,
    Forecast: (data.forecast[i] ?? 0) > 0 ? data.forecast[i] : null,
  }));

  // Show full project timeline — no trimming
  const chartData = allPoints;

  // Thin but ALWAYS keep the data date point
  const step = Math.max(1, Math.floor(chartData.length / 18));
  const seen = new Set<string>();
  const thinned = chartData.filter((p, i) => {
    if (seen.has(p.label)) return false;
    seen.add(p.label);
    return i % step === 0 || p.label === ddStr;
  });

  // Auto Y-axis: start just below the minimum visible value
  const allVals = thinned.flatMap(p => [p.Baseline, p.Actual, p.Forecast]).filter((v): v is number => v !== null);
  const minVal = allVals.length ? Math.max(0, Math.floor(Math.min(...allVals) / 5) * 5 - 5) : 0;

  const ddInChart = thinned.some(p => p.label === ddStr);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 shadow-lg rounded-xl p-3 text-xs min-w-36">
        <div className="flex items-center gap-2 mb-2">
          <p className="font-semibold text-slate-600">{label}</p>
          {label === ddStr && (
            <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Data Date</span>
          )}
        </div>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className="text-slate-500">{p.name}</span>
            </div>
            <span className="font-bold text-slate-800">{p.value?.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Progress S-Curve</h3>
          <p className="text-xs text-slate-400 mt-0.5">Cumulative % complete — Baseline vs Actual vs Forecast</p>
        </div>
        {ddStr && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg shrink-0">
            <div className="w-3 h-0.5 bg-blue-600 inline-block" />
            <span className="text-xs text-blue-700 font-semibold">Data Date: {ddStr}</span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={thinned} margin={{ top: 10, right: 40, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#1E293B" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#1E293B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              axisLine={false} tickLine={false}
              interval="preserveStartEnd" minTickGap={40}
              angle={-35} textAnchor="end" height={48}
            />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              axisLine={false} tickLine={false}
              domain={[minVal, 100]}
              width={38}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 16 }}
              formatter={(v) => <span style={{ color: "#64748B" }}>{v}</span>}
            />

            <Area type="monotone" dataKey="Baseline" stroke="#1E293B" strokeWidth={2}   fill="url(#baselineGrad)" dot={false} />
            <Line type="monotone" dataKey="Actual"   stroke="#2563EB" strokeWidth={2.5} dot={false} strokeDasharray="6 3" />
            <Line type="monotone" dataKey="Forecast" stroke="#94A3B8" strokeWidth={1.5} dot={false} strokeDasharray="3 4" />

            {/* Data date line — after series so it renders on top */}
            {ddStr && ddInChart && (
              <ReferenceLine
                x={ddStr}
                stroke="#2563EB"
                strokeWidth={2}
                label={{ value: "Data Date ▲", position: "insideTopLeft", fontSize: 10, fill: "#2563EB", fontWeight: 700 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
