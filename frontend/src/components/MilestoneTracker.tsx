"use client";
import { useState } from "react";
import { Milestone } from "@/lib/api";

type Filter = "all" | "delayed" | "hit" | "forecast";

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  "Hit":                   { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-500" },
  "Hit (early)":           { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-500" },
  "Missed":                { bg: "bg-red-500/10",     text: "text-red-400",     dot: "bg-red-500" },
  "Not Started (Delayed)": { bg: "bg-red-500/10",     text: "text-red-400",     dot: "bg-red-500" },
  "Forecast On Track":     { bg: "bg-slate-700/50",   text: "text-slate-400",   dot: "bg-slate-500" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || { bg: "bg-slate-700/50", text: "text-slate-400", dot: "bg-slate-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} shrink-0`} />
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
    <div className="bg-[#0D1829] rounded-2xl border border-white/[0.07] shadow-xl shadow-black/30 overflow-hidden">

      {/* Summary metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-white/[0.06]">
        <div className="px-5 py-4 border-r border-white/[0.06]">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-200 tabular-nums">{data.length}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">milestones</p>
        </div>
        <div className="px-5 py-4 border-r border-white/[0.06]">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Delayed</p>
          <p className="text-2xl font-bold text-red-400 tabular-nums">{counts.delayed}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">{worstDelay ? `worst: ${Math.abs(worstDelay.variance_days)}d late` : "none"}</p>
        </div>
        <div className="px-5 py-4 border-r border-white/[0.06]">
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Achieved</p>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">{counts.hit}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">{earlyCount > 0 ? `${earlyCount} early` : "on or late"}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Forecast</p>
          <p className="text-2xl font-bold text-slate-300 tabular-nums">{counts.forecast}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">pending completion</p>
        </div>
      </div>

      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Milestone Tracker</h3>
            <p className="text-xs text-slate-500 mt-0.5">Baseline vs Actual / Forecast · variance in calendar days</p>
          </div>
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5">
            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search milestones…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none w-40"
            />
          </div>
        </div>

        <div className="flex gap-1 mt-3">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === f.key
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]"
              }`}
            >
              {f.label}
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-md ${filter === f.key ? "bg-white/20" : "bg-white/[0.05] text-slate-600"}`}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] overflow-y-auto max-h-[520px] print:overflow-visible print:max-h-none">
        <table className="w-full min-w-[640px] text-xs">
          <thead className="sticky top-0 bg-[#0D1829] border-b border-white/[0.07] z-10">
            <tr>
              <th className="text-left px-6 py-3 text-slate-500 font-semibold">Code</th>
              <th className="text-left px-3 py-3 text-slate-500 font-semibold">Milestone</th>
              <th className="text-right px-3 py-3 text-slate-500 font-semibold">Baseline</th>
              <th className="text-right px-3 py-3 text-slate-500 font-semibold">Actual</th>
              <th className="text-right px-3 py-3 text-slate-500 font-semibold">Forecast</th>
              <th className="text-right px-3 py-3 text-slate-500 font-semibold">Var.</th>
              <th className="text-right px-6 py-3 text-slate-500 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => (
              <tr key={i} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 !== 0 ? "bg-white/[0.01]" : ""}`}>
                <td className="px-6 py-2.5 text-slate-600 font-mono text-[10px]">{m.task_code}</td>
                <td className="px-3 py-2.5 text-slate-300 max-w-xs print:max-w-none">
                  <p className="truncate print:whitespace-normal font-medium">{m.task_name}</p>
                </td>
                <td className="px-3 py-2.5 text-right text-slate-500 font-mono text-[11px]">{m.baseline || "—"}</td>
                <td className="px-3 py-2.5 text-right text-slate-500 font-mono text-[11px]">{m.actual || "—"}</td>
                <td className="px-3 py-2.5 text-right text-slate-500 font-mono text-[11px]">{m.forecast || "—"}</td>
                <td className={`px-3 py-2.5 text-right font-bold text-[11px] tabular-nums ${m.variance_days < 0 ? "text-red-400" : m.variance_days > 0 ? "text-emerald-400" : "text-slate-600"}`}>
                  {m.variance_days > 0 ? `+${m.variance_days}d` : m.variance_days === 0 ? "—" : `${m.variance_days}d`}
                </td>
                <td className="px-6 py-2.5 text-right">
                  <StatusBadge status={m.status} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-slate-600 text-xs">
                  No milestones match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 border-t border-white/[0.06] bg-white/[0.01]">
        <p className="text-[10px] text-slate-600">Showing {filtered.length} of {data.length} milestones</p>
      </div>
    </div>
  );
}
