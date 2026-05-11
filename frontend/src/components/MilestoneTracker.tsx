"use client";
import { useState } from "react";
import { Milestone } from "@/lib/api";

type Filter = "all" | "delayed" | "hit" | "forecast";

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  "Hit":                   { bg: "var(--success-light)",  text: "var(--success)",  dot: "var(--success)" },
  "Hit (early)":           { bg: "var(--success-light)",  text: "var(--success)",  dot: "var(--success)" },
  "Missed":                { bg: "var(--danger-light)",   text: "var(--danger)",   dot: "var(--danger)" },
  "Not Started (Delayed)": { bg: "var(--danger-light)",   text: "var(--danger)",   dot: "var(--danger)" },
  "Forecast On Track":     { bg: "var(--bg-raised)",      text: "var(--text-secondary)", dot: "var(--text-muted)" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || { bg: "var(--bg-raised)", text: "var(--text-muted)", dot: "var(--text-muted)" };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold"
      style={{ fontSize: 11, background: s.bg, color: s.text, border: `1px solid ${s.dot}22` }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {status}
    </span>
  );
}

export default function MilestoneTracker({ data }: { data: Milestone[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filtered = data.filter((m) => {
    const matchFilter =
      filter === "all"      ? true :
      filter === "delayed"  ? m.variance_days < 0 :
      filter === "hit"      ? m.actual !== "" :
      filter === "forecast" ? m.actual === "" && m.forecast !== "" : true;
    const matchSearch = !search ||
      m.task_name.toLowerCase().includes(search.toLowerCase()) ||
      m.task_code.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    all:      data.length,
    delayed:  data.filter(m => m.variance_days < 0).length,
    hit:      data.filter(m => m.actual !== "").length,
    forecast: data.filter(m => m.actual === "" && m.forecast !== "").length,
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all",      label: "All" },
    { key: "hit",      label: "Achieved" },
    { key: "delayed",  label: "Delayed" },
    { key: "forecast", label: "Forecast" },
  ];

  const worstDelay = data.filter(m => m.variance_days < 0).sort((a, b) => a.variance_days - b.variance_days)[0];
  const earlyCount = data.filter(m => m.actual !== "" && m.variance_days > 0).length;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(13,27,62,0.06)" }}>

      {/* Summary metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ borderBottom: "1px solid var(--border)" }}>
        {[
          { label: "Total", value: data.length, sub: "milestones", color: "var(--text-primary)" },
          { label: "Delayed", value: counts.delayed, sub: worstDelay ? `worst: ${Math.abs(worstDelay.variance_days)}d late` : "none", color: "var(--danger)" },
          { label: "Achieved", value: counts.hit, sub: earlyCount > 0 ? `${earlyCount} early` : "on or late", color: "var(--success)" },
          { label: "Forecast", value: counts.forecast, sub: "pending completion", color: "var(--text-secondary)" },
        ].map((m, i, arr) => (
          <div key={m.label} className="px-5 py-4 text-center"
            style={{ borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
            <p className="font-bold uppercase tracking-wider mb-1" style={{ fontSize: 10, color: m.color, letterSpacing: "0.07em" }}>{m.label}</p>
            <p className="font-bold tabular-nums" style={{ fontSize: 22, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</p>
            <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-bold" style={{ fontSize: 14, color: "var(--text-primary)" }}>Milestone Tracker</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Baseline vs Actual / Forecast · variance in calendar days</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-muted)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" placeholder="Search milestones…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none"
              style={{ fontSize: 12, color: "var(--text-primary)", width: 160, fontFamily: "inherit" }}
            />
          </div>
        </div>

        <div className="flex gap-1 mt-3">
          {filters.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="rounded-lg px-3 py-1.5 font-medium transition-all"
              style={{
                fontSize: 12,
                background: filter === f.key ? "var(--primary)" : "transparent",
                color: filter === f.key ? "#fff" : "var(--text-muted)",
              }}
              onMouseEnter={(e) => { if (filter !== f.key) { e.currentTarget.style.background = "var(--bg-raised)"; } }}
              onMouseLeave={(e) => { if (filter !== f.key) { e.currentTarget.style.background = "transparent"; } }}>
              {f.label}
              <span className="ml-1.5 px-1.5 py-0.5 rounded-md" style={{
                fontSize: 10,
                background: filter === f.key ? "rgba(255,255,255,0.2)" : "var(--bg-raised)",
                color: filter === f.key ? "#fff" : "var(--text-muted)",
              }}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto print:overflow-visible print:max-h-none" style={{ maxHeight: 520 }}>
        <table className="w-full min-w-[640px]" style={{ fontSize: 12 }}>
          <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)", borderBottom: "1px solid var(--border)", zIndex: 10 }}>
            <tr>
              {["Code", "Milestone", "Baseline", "Actual", "Forecast", "Var.", "Status"].map((h, i) => (
                <th key={h} className={i === 0 || i === 6 ? "px-6 py-3" : "px-3 py-3"}
                  style={{ textAlign: i > 1 ? "right" : "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 !== 0 ? "var(--bg-card2)" : "var(--bg-card)" }}>
                <td className="px-6 py-2.5 font-mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.task_code}</td>
                <td className="px-3 py-2.5 max-w-xs print:max-w-none">
                  <p className="truncate font-medium print:whitespace-normal" style={{ color: "var(--text-primary)" }}>{m.task_name}</p>
                </td>
                <td className="px-3 py-2.5 text-right font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.baseline || "—"}</td>
                <td className="px-3 py-2.5 text-right font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.actual || "—"}</td>
                <td className="px-3 py-2.5 text-right font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.forecast || "—"}</td>
                <td className="px-3 py-2.5 text-right font-bold tabular-nums"
                  style={{
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: m.variance_days < 0 ? "var(--danger)" : m.variance_days > 0 ? "var(--success)" : "var(--text-muted)",
                  }}>
                  {m.variance_days > 0 ? `+${m.variance_days}d` : m.variance_days === 0 ? "—" : `${m.variance_days}d`}
                </td>
                <td className="px-6 py-2.5 text-right"><StatusBadge status={m.status} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-10 text-center" style={{ color: "var(--text-muted)", fontSize: 13 }}>No milestones match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card2)" }}>
        <p style={{ fontSize: 10, color: "var(--text-muted)" }}>Showing {filtered.length} of {data.length} milestones</p>
      </div>
    </div>
  );
}
