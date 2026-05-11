"use client";
import { useState } from "react";
import { CriticalActivity } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  TK_Complete: "Complete",
  TK_Active:   "In Progress",
  TK_NotStart: "Not Started",
};

function FloatBadge({ days }: { days: number }) {
  const style = days < -10
    ? { background: "#FEF2F2", color: "#DC2626", border: "1px solid rgba(220,38,38,0.2)" }
    : days < 0
      ? { background: "#FFFBEB", color: "#D97706", border: "1px solid rgba(217,119,6,0.2)" }
      : { background: "var(--bg-raised)", color: "var(--text-secondary)", border: "1px solid var(--border)" };
  return (
    <span className="inline-block px-2 py-0.5 rounded-lg font-bold tabular-nums" style={{ ...style, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
      {days}d
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const p = parseFloat(String(pct)) || 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-raised)" }}>
        <div className="h-full rounded-full" style={{ width: `${p}%`, background: "var(--primary)", opacity: 0.7 }} />
      </div>
      <span className="tabular-nums" style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", minWidth: 28 }}>{p}%</span>
    </div>
  );
}

export default function CriticalPath({ data }: { data: CriticalActivity[] }) {
  const [showAll,   setShowAll]   = useState(false);
  const [showTable, setShowTable] = useState(false);
  const displayed = showAll ? data : data.slice(0, 20);

  const severeNeg = data.filter(a => a.total_float_days < -10).length;
  const mildNeg   = data.filter(a => a.total_float_days >= -10 && a.total_float_days < 0).length;
  const zeroFloat = data.filter(a => a.total_float_days === 0).length;
  const top5      = [...data].sort((a, b) => a.total_float_days - b.total_float_days).slice(0, 5);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(13,27,62,0.06)" }}>

      {/* Header */}
      <div className="px-6 py-4 flex items-start justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div>
          <h3 className="font-bold" style={{ fontSize: 14, color: "var(--text-primary)" }}>Critical Path Activities</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Activities with total float ≤ 0 days — sorted by most critical first</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 shrink-0"
          style={{ background: "#FEF2F2", border: "1px solid rgba(220,38,38,0.2)", fontSize: 12, color: "#DC2626" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "#DC2626" }} />
          {data.length.toLocaleString()} critical
        </div>
      </div>

      {/* Risk distribution */}
      <div className="grid grid-cols-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="px-5 py-4 text-center" style={{ borderRight: "1px solid var(--border)" }}>
          <p className="font-bold uppercase tracking-wider mb-0.5" style={{ fontSize: 10, color: "#DC2626", letterSpacing: "0.07em" }}>Severe (&lt; −10d)</p>
          <p className="font-bold tabular-nums" style={{ fontSize: 22, color: "#DC2626", fontFamily: "'JetBrains Mono', monospace" }}>{severeNeg}</p>
        </div>
        <div className="px-5 py-4 text-center" style={{ borderRight: "1px solid var(--border)" }}>
          <p className="font-bold uppercase tracking-wider mb-0.5" style={{ fontSize: 10, color: "#D97706", letterSpacing: "0.07em" }}>At Risk (−1 to −10d)</p>
          <p className="font-bold tabular-nums" style={{ fontSize: 22, color: "#D97706", fontFamily: "'JetBrains Mono', monospace" }}>{mildNeg}</p>
        </div>
        <div className="px-5 py-4 text-center">
          <p className="font-bold uppercase tracking-wider mb-0.5" style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.07em" }}>Zero Float</p>
          <p className="font-bold tabular-nums" style={{ fontSize: 22, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>{zeroFloat}</p>
        </div>
      </div>

      {/* Top 5 */}
      {top5.length > 0 && (
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="font-bold uppercase tracking-widest mb-3" style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em" }}>
            Top {top5.length} Highest Risk Activities
          </p>
          <div className="space-y-2">
            {top5.map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                style={{
                  background: a.total_float_days < -10 ? "#FEF2F2" : "#FFFBEB",
                  border: `1px solid ${a.total_float_days < -10 ? "rgba(220,38,38,0.15)" : "rgba(217,119,6,0.15)"}`,
                }}>
                <span className="font-bold w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    fontSize: 10,
                    background: a.total_float_days < -10 ? "rgba(220,38,38,0.15)" : "rgba(217,119,6,0.15)",
                    color: a.total_float_days < -10 ? "#DC2626" : "#D97706",
                  }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ fontSize: 12, color: "var(--text-primary)" }}>{a.task_name}</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>{a.task_code} · {STATUS_LABEL[a.status] || a.status}</p>
                </div>
                <FloatBadge days={a.total_float_days} />
                <ProgressBar pct={parseFloat(a.pct_complete)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toggle table */}
      <div className="px-6 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card2)" }}>
        <button onClick={() => setShowTable(!showTable)}
          className="flex items-center gap-1.5 font-semibold transition-colors"
          style={{ fontSize: 12, color: "var(--text-secondary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
          <svg className={`w-3.5 h-3.5 transition-transform ${showTable ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showTable ? "Hide" : "Show"} full activity table ({data.length} activities)
        </button>
      </div>

      {/* Table */}
      <div className={`overflow-x-auto print:overflow-visible ${showTable ? "" : "hidden print:block"}`}>
        <table className="w-full min-w-[640px]" style={{ fontSize: 12 }}>
          <thead style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card2)" }}>
            <tr>
              {["Code", "Activity Name", "Total Float", "% Complete", "Forecast Finish", "Status"].map((h, i) => (
                <th key={h} className={i === 0 || i === 5 ? "px-6 py-3" : "px-3 py-3"} style={{ textAlign: i > 1 ? "right" : "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((a, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 !== 0 ? "var(--bg-card2)" : "var(--bg-card)" }}>
                <td className="px-6 py-2.5 font-mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>{a.task_code}</td>
                <td className="px-3 py-2.5 max-w-xs print:max-w-none">
                  <p className="truncate font-medium print:whitespace-normal" style={{ color: "var(--text-primary)" }}>{a.task_name}</p>
                </td>
                <td className="px-3 py-2.5 text-right"><FloatBadge days={a.total_float_days} /></td>
                <td className="px-3 py-2.5 text-right"><ProgressBar pct={parseFloat(a.pct_complete)} /></td>
                <td className="px-3 py-2.5 text-right font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{a.forecast_end || "—"}</td>
                <td className="px-6 py-2.5 text-right">
                  <span className="inline-block px-2 py-0.5 rounded-lg font-semibold" style={{
                    fontSize: 11,
                    background: a.status === "TK_Complete" ? "var(--success-light)" : a.status === "TK_Active" ? "var(--primary-light)" : "var(--bg-raised)",
                    color: a.status === "TK_Complete" ? "var(--success)" : a.status === "TK_Active" ? "var(--primary)" : "var(--text-muted)",
                  }}>
                    {STATUS_LABEL[a.status] || a.status}
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center" style={{ color: "var(--text-muted)", fontSize: 13 }}>No critical activities found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data.length > 20 && (
        <div className="px-6 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card2)" }}>
          <p style={{ fontSize: 10, color: "var(--text-muted)" }}>Showing {displayed.length} of {data.length} critical activities</p>
          <button onClick={() => setShowAll(!showAll)} className="font-semibold transition-colors"
            style={{ fontSize: 12, color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
            {showAll ? "Show less" : `Show all ${data.length}`}
          </button>
        </div>
      )}
    </div>
  );
}
