"use client";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area,
} from "recharts";
import { SCurveData } from "@/lib/api";

function subtractMonths(yyyyMM: string, months: number): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  const d = new Date(y, m - 1 - months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ChartCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

export default function SCurve({ data }: { data: SCurveData }) {
  const ddStr = data.data_date?.slice(0, 7); // "YYYY-MM"

  // Build full dataset
  const allPoints = data.labels.map((label, i) => ({
    label:    label.slice(0, 7),
    Baseline: data.baseline[i],
    Actual:   data.actual[i]   > 0 ? data.actual[i]   : null,
    Forecast: data.forecast[i] > 0 ? data.forecast[i] : null,
  }));

  // Window: (data_date − 6 months) → ALL future data
  const windowStart = ddStr ? subtractMonths(ddStr, 6) : allPoints[0]?.label ?? "";
  const chartData = allPoints.filter(p => p.label >= windowStart);

  // Thin out ticks — but ALWAYS keep the data date point so ReferenceLine renders
  const step = Math.max(1, Math.floor(chartData.length / 18));
  const thinned = chartData.filter((p, i) => i % step === 0 || p.label === ddStr);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    const isDD = label === ddStr;
    return (
      <div className="bg-white border border-slate-200 shadow-lg rounded-xl p-3 text-xs min-w-36">
        <div className="flex items-center gap-2 mb-2">
          <p className="font-semibold text-slate-600">{label}</p>
          {isDD && (
            <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
              Data Date
            </span>
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
    <ChartCard
      title="Progress S-Curve"
      sub="Cumulative % complete — Baseline vs Actual vs Forecast"
    >
      {/* Data date callout */}
      {ddStr && (
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="w-4 h-0.5 bg-blue-500 rounded-full" />
          <div className="w-0.5 h-4 bg-blue-500 rounded-full" />
          <span className="text-xs text-blue-600 font-semibold">Data Date: {ddStr}</span>
          <span className="text-[10px] text-slate-400">· showing 6 months prior + all future dates</span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={thinned} margin={{ top: 10, right: 40, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#1E293B" stopOpacity={0.08} />
              <stop offset="95%" stopColor="#1E293B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
            angle={-35}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            width={38}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 16 }}
            formatter={(value) => <span style={{ color: "#64748B" }}>{value}</span>}
          />

          {/* Data date vertical line — always rendered if ddStr exists */}
          {ddStr && (
            <ReferenceLine
              x={ddStr}
              stroke="#3B82F6"
              strokeWidth={2.5}
              label={{
                value: "Data Date",
                position: "insideTopLeft",
                fontSize: 10,
                fill: "#3B82F6",
                fontWeight: 700,
                dy: -4,
              }}
            />
          )}

          <Area type="monotone" dataKey="Baseline" stroke="#1E293B" strokeWidth={2}   fill="url(#baselineGrad)" dot={false} />
          <Line type="monotone" dataKey="Actual"   stroke="#475569" strokeWidth={2.5} dot={false} strokeDasharray="6 3" />
          <Line type="monotone" dataKey="Forecast" stroke="#94A3B8" strokeWidth={1.5} dot={false} strokeDasharray="3 4" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
