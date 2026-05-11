"use client";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { ResourceMonth } from "@/lib/api";

export default function ResourceHistogram({ data }: { data: ResourceMonth[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(13,27,62,0.06)" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-bold" style={{ fontSize: 14, color: "var(--text-primary)" }}>Resourcing — Planned vs Actual</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Labour units by month</p>
        </div>
        <div className="p-10 text-center">
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No resource assignment data found in the XER file.</p>
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
      <div className="rounded-xl p-3" style={{ background: "#FFFFFF", border: "1px solid var(--border-md)", boxShadow: "0 8px 32px rgba(13,27,62,0.12)", fontSize: 12 }}>
        <p className="font-bold mb-2" style={{ color: "var(--text-primary)" }}>{label}</p>
        {payload.map(p => (
          <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
            <span style={{ color: "var(--text-muted)" }}>{p.name}</span>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{p.value?.toLocaleString()}</span>
          </div>
        ))}
        <div className="pt-1 mt-1 flex justify-between" style={{ borderTop: "1px solid var(--border)" }}>
          <span style={{ color: "var(--text-muted)" }}>Variance</span>
          <span className="font-bold" style={{ color: variance >= 0 ? "var(--success)" : "var(--danger)" }}>
            {variance >= 0 ? "+" : ""}{variance.toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(13,27,62,0.06)" }}>
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <h3 className="font-bold" style={{ fontSize: 14, color: "var(--text-primary)" }}>Resourcing — Planned vs Actual</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Labour units by month (target vs actuals)</p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} minTickGap={30} angle={-35} textAnchor="end" height={44} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} formatter={(v) => <span style={{ color: "var(--text-secondary)" }}>{v}</span>} />
            <Bar dataKey="actual" name="Actual" fill="rgba(30,64,175,0.15)" radius={[3,3,0,0]} maxBarSize={24} />
            <Line type="monotone" dataKey="planned" name="Planned" stroke="#1E40AF" strokeWidth={2.5} dot={{ r: 4, fill: "#1E40AF" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
