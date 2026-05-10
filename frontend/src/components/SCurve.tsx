"use client";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area,
} from "recharts";
import { SCurveData } from "@/lib/api";

function toYM(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (!isNaN(d.getTime()))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = raw.split("-");
  return `${y}-${String(m).padStart(2, "0")}`;
}

function subtractMonths(ym: string, n: number): string {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function SCurve({ data }: { data: SCurveData }) {
  const ddStr = toYM(data.data_date ?? "");

  const allPoints = data.labels.map((label, i) => ({
    label:    toYM(label),
    Baseline: data.baseline[i]  ?? null,
    Actual:   (data.actual[i]   ?? 0) > 0 ? data.actual[i]   : null,
    Forecast: (data.forecast[i] ?? 0) > 0 ? data.forecast[i] : null,
  }));

  const windowStart = subtractMonths(ddStr, 12);
  const chartData   = allPoints.filter(p => p.label >= windowStart);

  const seen    = new Set<string>();
  const thinned = chartData.filter((p) => {
    if (seen.has(p.label)) return false;
    seen.add(p.label);
    return true;
  });

  const allVals = thinned.flatMap(p => [p.Baseline, p.Actual, p.Forecast]).filter((v): v is number => v !== null);
  const minVal  = allVals.length ? Math.max(0, Math.floor(Math.min(...allVals) / 5) * 5 - 5) : 0;
  const ddInChart = thinned.some(p => p.label === ddStr);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#0A1220] border border-white/[0.1] shadow-2xl rounded-xl p-3 text-xs min-w-36">
        <div className="flex items-center gap-2 mb-2">
          <p className="font-semibold text-slate-300">{label}</p>
          {label === ddStr && (
            <span className="text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded">Data Date</span>
          )}
        </div>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className="text-slate-500">{p.name}</span>
            </div>
            <span className="font-bold text-slate-200">{p.value?.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-[#0D1829] rounded-2xl border border-white/[0.07] shadow-xl shadow-black/30">
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Progress S-Curve</h3>
          <p className="text-xs text-slate-500 mt-0.5">Cumulative % complete — Baseline vs Actual vs Forecast</p>
        </div>
        {ddStr && (
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg shrink-0">
            <div className="w-3 h-0.5 bg-blue-500 inline-block" />
            <span className="text-xs text-blue-400 font-semibold">Data Date: {ddStr}</span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={thinned} margin={{ top: 10, right: 40, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#64748B" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#64748B" stopOpacity={0} />
              </linearGradient>
              <filter id="glowBlue">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "#475569" }}
              axisLine={false} tickLine={false}
              interval={0}
              angle={-45} textAnchor="end" height={56}
              tickFormatter={(val: string) => {
                if (!val) return "";
                const [y, m] = val.split("-");
                const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m) - 1] ?? m;
                return `${mon} '${String(y).slice(2)}`;
              }}
            />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: "#475569" }}
              axisLine={false} tickLine={false}
              domain={[minVal, 100]}
              width={38}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 16 }}
              formatter={(v) => <span style={{ color: "#64748B" }}>{v}</span>}
            />

            <Area   type="monotone" dataKey="Baseline" stroke="#475569" strokeWidth={1.5} fill="url(#baselineGrad)" dot={false} />
            <Line   type="monotone" dataKey="Actual"   stroke="#3B82F6" strokeWidth={2.5} dot={false} strokeDasharray="6 3" />
            <Line   type="monotone" dataKey="Forecast" stroke="#64748B" strokeWidth={1.5} dot={false} strokeDasharray="3 4" />

            {ddStr && ddInChart && (
              <ReferenceLine
                x={ddStr}
                stroke="#3B82F6"
                strokeWidth={1.5}
                strokeOpacity={0.7}
                label={{ value: "Data Date ▲", position: "insideTopLeft", fontSize: 9, fill: "#3B82F6", fontWeight: 700 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
