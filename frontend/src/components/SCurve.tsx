"use client";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area,
} from "recharts";
import { SCurveData } from "@/lib/api";

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
  const step = Math.max(1, Math.floor(data.labels.length / 18));
  const ddStr = data.data_date?.slice(0, 7);

  const chartData = data.labels
    .map((label, i) => ({
      label: label.slice(0, 7),
      Baseline: data.baseline[i],
      Actual: data.actual[i] > 0 ? data.actual[i] : null,
      Forecast: data.forecast[i] > 0 ? data.forecast[i] : null,
    }))
    .filter((_, i) => i % step === 0);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 shadow-lg rounded-xl p-3 text-xs min-w-36">
        <p className="font-semibold text-slate-600 mb-2">{label}</p>
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
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 40, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1E293B" stopOpacity={0.1} />
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
          {ddStr && (
            <ReferenceLine
              x={ddStr}
              stroke="#94A3B8"
              strokeDasharray="4 3"
              label={{ value: "DD", position: "insideTopRight", fontSize: 9, fill: "#94A3B8" }}
            />
          )}
          <Area type="monotone" dataKey="Baseline" stroke="#1E293B" strokeWidth={2} fill="url(#baselineGrad)" dot={false} />
          <Line type="monotone" dataKey="Actual" stroke="#475569" strokeWidth={2.5} dot={false} strokeDasharray="6 3" />
          <Line type="monotone" dataKey="Forecast" stroke="#94A3B8" strokeWidth={1.5} dot={false} strokeDasharray="3 4" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
