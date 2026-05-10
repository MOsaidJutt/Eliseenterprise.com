"use client";
import { useState } from "react";
import { CriticalActivity } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  TK_Complete: "Complete",
  TK_Active:   "In Progress",
  TK_NotStart: "Not Started",
};

const STATUS_STYLE: Record<string, string> = {
  TK_Complete: "bg-emerald-500/10 text-emerald-400",
  TK_Active:   "bg-blue-500/10 text-blue-400",
  TK_NotStart: "bg-slate-700/50 text-slate-400",
};

function FloatBadge({ days }: { days: number }) {
  const color = days < -10
    ? "bg-red-500/15 text-red-400 border border-red-500/25"
    : days < 0
      ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
      : "bg-slate-700/50 text-slate-400";
  return <span className={`inline-block px-2 py-0.5 rounded-lg font-bold text-[11px] font-mono ${color}`}>{days}d</span>;
}

function ProgressBar({ pct }: { pct: number }) {
  const p = parseFloat(String(pct)) || 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1 bg-white/[0.08] rounded-full overflow-hidden">
        <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${p}%` }} />
      </div>
      <span className="text-[11px] text-slate-500 font-mono w-7">{p}%</span>
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
    <div className="bg-[#0D1829] rounded-2xl border border-white/[0.07] shadow-xl shadow-black/30 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Critical Path Activities</h3>
          <p className="text-xs text-slate-500 mt-0.5">Activities with total float ≤ 0 days — sorted by most critical first</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/[0.08] border border-red-500/20 px-3 py-1.5 rounded-lg shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          {data.length.toLocaleString()} critical
        </div>
      </div>

      {/* Risk distribution */}
      <div className="grid grid-cols-3 gap-0 border-b border-white/[0.06]">
        <div className="px-5 py-3 border-r border-white/[0.06] text-center">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Severe (&lt; −10d)</p>
          <p className="text-xl font-bold text-red-400 tabular-nums">{severeNeg}</p>
        </div>
        <div className="px-5 py-3 border-r border-white/[0.06] text-center">
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-0.5">At Risk (−1 to −10d)</p>
          <p className="text-xl font-bold text-amber-400 tabular-nums">{mildNeg}</p>
        </div>
        <div className="px-5 py-3 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Zero Float</p>
          <p className="text-xl font-bold text-slate-300 tabular-nums">{zeroFloat}</p>
        </div>
      </div>

      {/* Top 5 highest risk */}
      {top5.length > 0 && (
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Top {top5.length} Highest Risk Activities</p>
          <div className="space-y-2">
            {top5.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border ${a.total_float_days < -10 ? "bg-red-500/[0.06] border-red-500/15" : "bg-amber-500/[0.05] border-amber-500/15"}`}>
                <span className={`text-[10px] font-bold w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                  a.total_float_days < -10 ? "bg-red-500/20 text-red-400" : "bg-amber-500/15 text-amber-400"
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-300 truncate">{a.task_name}</p>
                  <p className="text-[10px] text-slate-600 font-mono">{a.task_code} · {STATUS_LABEL[a.status] || a.status}</p>
                </div>
                <FloatBadge days={a.total_float_days} />
                <ProgressBar pct={parseFloat(a.pct_complete)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toggle full table */}
      <div className="px-6 py-3 border-b border-white/[0.06] bg-white/[0.01]">
        <button
          onClick={() => setShowTable(!showTable)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-colors"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${showTable ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showTable ? "Hide" : "Show"} full activity table ({data.length} activities)
        </button>
      </div>

      {/* Table */}
      <div className={`overflow-x-auto [-webkit-overflow-scrolling:touch] print:overflow-visible ${showTable ? "" : "hidden print:block"}`}>
        <table className="w-full min-w-[640px] text-xs">
          <thead className="border-b border-white/[0.06]">
            <tr className="bg-white/[0.01]">
              <th className="text-left px-6 py-3 text-slate-500 font-semibold">Code</th>
              <th className="text-left px-3 py-3 text-slate-500 font-semibold">Activity Name</th>
              <th className="text-right px-3 py-3 text-slate-500 font-semibold">Total Float</th>
              <th className="text-right px-3 py-3 text-slate-500 font-semibold whitespace-nowrap">% Complete</th>
              <th className="text-right px-3 py-3 text-slate-500 font-semibold whitespace-nowrap">Forecast Finish</th>
              <th className="text-right px-6 py-3 text-slate-500 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((a, i) => (
              <tr key={i} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 !== 0 ? "bg-white/[0.01]" : ""}`}>
                <td className="px-6 py-2.5 text-slate-600 font-mono text-[10px]">{a.task_code}</td>
                <td className="px-3 py-2.5 text-slate-300 max-w-xs print:max-w-none">
                  <p className="truncate print:whitespace-normal font-medium">{a.task_name}</p>
                </td>
                <td className="px-3 py-2.5 text-right"><FloatBadge days={a.total_float_days} /></td>
                <td className="px-3 py-2.5 text-right"><ProgressBar pct={parseFloat(a.pct_complete)} /></td>
                <td className="px-3 py-2.5 text-right text-slate-500 font-mono text-[11px]">{a.forecast_end || "—"}</td>
                <td className="px-6 py-2.5 text-right">
                  <span className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-semibold ${STATUS_STYLE[a.status] || "bg-slate-700/50 text-slate-400"}`}>
                    {STATUS_LABEL[a.status] || a.status}
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-600">No critical activities found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data.length > 20 && (
        <div className="px-6 py-3 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between">
          <p className="text-[10px] text-slate-600">Showing {displayed.length} of {data.length} critical activities</p>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-slate-500 font-semibold hover:text-slate-300 transition-colors"
          >
            {showAll ? "Show less" : `Show all ${data.length}`}
          </button>
        </div>
      )}
    </div>
  );
}
