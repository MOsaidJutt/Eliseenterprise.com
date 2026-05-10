"use client";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { ResourceMonth } from "@/lib/api";

export default function ResourceHistogram({ data }: { data: ResourceMonth[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-[#0D1829] rounded-2xl border border-white/[0.07] shadow-xl shadow-black/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-slate-200">Resourcing — Planned vs Actual</h3>
          <p className="text-xs text-slate-500 mt-0.5">Labour units by month</p>
        </div>
        <div className="p-10 text-center">
          <p className="text-xs text-slate-600">No resource assignment data found in the XER file.</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    const planned  = payload.find(p => p.name === "Planned")?.value ?? 0;
    const actual   = payload.find(p => p.name === "Actual")?.value ?? 0;
    const variance = actual - planned;
    return (
      <div className="bg-[#0A1220] border border-white/[0.1] shadow-2xl rounded-xl p-3 text-xs">
        <p className="font-bold text-slate-300 mb-2">{label}</p>
        {payload.map(p => (
          <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
            <span className="text-slate-500">{p.name}</span>
            <span className="font-semibold text-slate-300">{p.value?.toLocaleString()}</span>
          </div>
        ))}
        <div className="pt-1 mt-1 border-t border-white/[0.07] flex justify-between">
          <span className="text-slate-500">Variance</span>
          <span className={`font-bold ${variance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {variance >= 0 ? "+" : ""}{variance.toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#0D1829] rounded-2xl border border-white/[0.07] shadow-xl shadow-black/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-bold text-slate-200">Resourcing — Planned vs Actual</h3>
        <p className="text-xs text-slate-500 mt-0.5">Labour units by month (target vs actuals)</p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "#475569" }}
              axisLine={false} tickLine={false}
              minTickGap={30} angle={-35} textAnchor="end" height={44}
            />
            <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} formatter={(v) => <span style={{ color: "#64748B" }}>{v}</span>} />
            <Bar dataKey="actual" name="Actual" fill="rgba(59,130,246,0.25)" radius={[3,3,0,0]} maxBarSize={24} />
            <Line type="monotone" dataKey="planned" name="Planned" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: "#3B82F6" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
