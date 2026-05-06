"use client";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { ResourceMonth } from "@/lib/api";

export default function ResourceHistogram({ data }: { data: ResourceMonth[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Resourcing — Planned vs Actual</h3>
          <p className="text-xs text-slate-400 mt-0.5">Labour units by month</p>
        </div>
        <div className="p-10 text-center">
          <p className="text-xs text-slate-400">No resource assignment data found in the XER file.</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    const planned = payload.find(p => p.name === "Planned")?.value ?? 0;
    const actual = payload.find(p => p.name === "Actual")?.value ?? 0;
    const variance = actual - planned;
    return (
      <div className="bg-white border border-slate-200 shadow-lg rounded-xl p-3 text-xs">
        <p className="font-bold text-slate-700 mb-2">{label}</p>
        {payload.map(p => (
          <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
            <span className="text-slate-400">{p.name}</span>
            <span className="font-semibold">{p.value?.toLocaleString()}</span>
          </div>
        ))}
        <div className="pt-1 mt-1 border-t border-slate-100 flex justify-between">
          <span className="text-slate-400">Variance</span>
          <span className={`font-bold ${variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {variance >= 0 ? "+" : ""}{variance.toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">Resourcing — Planned vs Actual</h3>
        <p className="text-xs text-slate-400 mt-0.5">Labour units by month (target vs actuals)</p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} minTickGap={30} angle={-35} textAnchor="end" height={44} />
            <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} formatter={(v) => <span style={{ color: "#64748B" }}>{v}</span>} />
            <Bar dataKey="actual" name="Actual" fill="#E2E8F0" radius={[3, 3, 0, 0]} maxBarSize={24} />
            <Line type="monotone" dataKey="planned" name="Planned" stroke="#1E293B" strokeWidth={2.5} dot={{ r: 4, fill: "#1E293B" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
