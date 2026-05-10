"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { PPCRow } from "@/lib/api";

function ppcBadge(pct: number) {
  if (pct >= 70) return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  if (pct >= 45) return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
  return "bg-red-500/10 text-red-400 border border-red-500/20";
}

export default function PPCTable({ data }: { data: PPCRow[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-[#0D1829] rounded-2xl border border-white/[0.07] shadow-xl shadow-black/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-slate-200">PPC — Planned Percent Complete</h3>
          <p className="text-xs text-slate-500 mt-0.5">Weekly schedule adherence</p>
        </div>
        <div className="p-10 text-center">
          <div className="w-12 h-12 bg-white/[0.04] rounded-xl flex items-center justify-center mx-auto mb-3 border border-white/[0.07]">
            <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-400 mb-1">Upload 2+ weekly snapshots</p>
          <p className="text-xs text-slate-600">PPC tracking requires consecutive XER files to compare planned vs actual progress between periods.</p>
        </div>
      </div>
    );
  }

  const chartData = data.map((r) => ({
    label: r.data_date,
    "Starts (PPCs)":  r.ppc_s_pct,
    "Finishes (PPCf)": r.ppc_f_pct,
    "Total (PPCt)":   r.ppc_t_pct,
  }));

  return (
    <div className="bg-[#0D1829] rounded-2xl border border-white/[0.07] shadow-xl shadow-black/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-bold text-slate-200">PPC — Planned Percent Complete</h3>
        <p className="text-xs text-slate-500 mt-0.5">Weekly adherence to planned starts and finishes</p>
      </div>

      <div className="p-6">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#475569" }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              formatter={(v) => `${v}%`}
              contentStyle={{ background: "rgba(10,18,33,0.97)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 10, color: "#CBD5E1" }}
            />
            <ReferenceLine y={60} stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" label={{ value: "60%", position: "right", fontSize: 9, fill: "#475569" }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} formatter={(v) => <span style={{ color: "#64748B" }}>{v}</span>} />
            <Line type="monotone" dataKey="Starts (PPCs)"   stroke="#3B82F6" strokeWidth={2}   dot={{ r: 4, fill: "#3B82F6" }} />
            <Line type="monotone" dataKey="Finishes (PPCf)" stroke="#64748B" strokeWidth={2}   dot={{ r: 4, fill: "#64748B" }} />
            <Line type="monotone" dataKey="Total (PPCt)"    stroke="#475569" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left pb-2 text-slate-500 font-semibold">Data Date</th>
                <th className="text-right pb-2 text-slate-500 font-semibold">Activities</th>
                <th className="text-right pb-2 text-slate-500 font-semibold">PPCs</th>
                <th className="text-right pb-2 text-slate-500 font-semibold">PPCf</th>
                <th className="text-right pb-2 text-slate-500 font-semibold">PPCt</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 !== 0 ? "bg-white/[0.01]" : ""}`}>
                  <td className="py-2 text-slate-400 font-mono text-[11px]">{row.data_date}</td>
                  <td className="py-2 text-right text-slate-500">{row.activity_count.toLocaleString()}</td>
                  <td className="py-2 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-lg font-semibold ${ppcBadge(row.ppc_s_pct)}`}>
                      {row.ppc_starts_actual}/{row.ppc_starts_planned} · {row.ppc_s_pct}%
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-lg font-semibold ${ppcBadge(row.ppc_f_pct)}`}>
                      {row.ppc_finishes_actual}/{row.ppc_finishes_planned} · {row.ppc_f_pct}%
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-lg font-bold ${ppcBadge(row.ppc_t_pct)}`}>
                      {row.ppc_t_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
