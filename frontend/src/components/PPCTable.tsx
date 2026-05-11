"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { PPCRow } from "@/lib/api";

function ppcStyle(pct: number): React.CSSProperties {
  if (pct >= 70) return { background: "var(--success-light)", color: "var(--success)", border: "1px solid rgba(5,150,105,0.2)" };
  if (pct >= 45) return { background: "var(--warn-light)", color: "var(--warn)", border: "1px solid rgba(217,119,6,0.2)" };
  return             { background: "var(--danger-light)", color: "var(--danger)", border: "1px solid rgba(220,38,38,0.2)" };
}

export default function PPCTable({ data }: { data: PPCRow[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(13,27,62,0.06)" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-bold" style={{ fontSize: 14, color: "var(--text-primary)" }}>PPC — Planned Percent Complete</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Weekly schedule adherence</p>
        </div>
        <div className="p-10 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-muted)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="font-semibold mb-1" style={{ fontSize: 14, color: "var(--text-secondary)" }}>Upload 2+ weekly snapshots</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>PPC tracking requires consecutive XER files to compare planned vs actual progress between periods.</p>
        </div>
      </div>
    );
  }

  const chartData = data.map((r) => ({
    label: r.data_date,
    "Starts (PPCs)":   r.ppc_s_pct,
    "Finishes (PPCf)": r.ppc_f_pct,
    "Total (PPCt)":    r.ppc_t_pct,
  }));

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(13,27,62,0.06)" }}>
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <h3 className="font-bold" style={{ fontSize: 14, color: "var(--text-primary)" }}>PPC — Planned Percent Complete</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Weekly adherence to planned starts and finishes</p>
      </div>

      <div className="p-6">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              formatter={(v) => `${v}%`}
              contentStyle={{ background: "#FFFFFF", border: "1px solid var(--border-md)", borderRadius: 10, color: "var(--text-primary)", fontSize: 12, boxShadow: "0 8px 32px rgba(13,27,62,0.12)" }}
            />
            <ReferenceLine y={60} stroke="var(--border-md)" strokeDasharray="3 3" label={{ value: "60%", position: "right", fontSize: 9, fill: "var(--text-muted)" }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} formatter={(v) => <span style={{ color: "var(--text-secondary)" }}>{v}</span>} />
            <Line type="monotone" dataKey="Starts (PPCs)"   stroke="#1E40AF" strokeWidth={2}   dot={{ r: 4, fill: "#1E40AF" }} />
            <Line type="monotone" dataKey="Finishes (PPCf)" stroke="#64748B" strokeWidth={2}   dot={{ r: 4, fill: "#64748B" }} />
            <Line type="monotone" dataKey="Total (PPCt)"    stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full" style={{ fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Data Date", "Activities", "PPCs", "PPCf", "PPCt"].map((h, i) => (
                  <th key={h} className="py-2" style={{ textAlign: i > 0 ? "right" : "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 !== 0 ? "var(--bg-card2)" : "var(--bg-card)" }}>
                  <td className="py-2 font-mono" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{row.data_date}</td>
                  <td className="py-2 text-right" style={{ color: "var(--text-muted)" }}>{row.activity_count.toLocaleString()}</td>
                  <td className="py-2 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-lg font-semibold" style={{ fontSize: 11, ...ppcStyle(row.ppc_s_pct) }}>
                      {row.ppc_starts_actual}/{row.ppc_starts_planned} · {row.ppc_s_pct}%
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-lg font-semibold" style={{ fontSize: 11, ...ppcStyle(row.ppc_f_pct) }}>
                      {row.ppc_finishes_actual}/{row.ppc_finishes_planned} · {row.ppc_f_pct}%
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-lg font-bold" style={{ fontSize: 11, ...ppcStyle(row.ppc_t_pct) }}>
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
