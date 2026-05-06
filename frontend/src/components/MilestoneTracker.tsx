"use client";
import { useState } from "react";
import { Milestone } from "@/lib/api";

type Filter = "all" | "delayed" | "hit" | "forecast";

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  "Hit":                  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Hit (early)":          { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Missed":               { bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-500" },
  "Not Started (Delayed)":{ bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-500" },
  "Forecast On Track":    { bg: "bg-slate-50",   text: "text-slate-600",   dot: "bg-slate-400" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
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
      filter === "all" ? true :
      filter === "delayed" ? m.variance_days < 0 :
      filter === "hit" ? (m.actual !== "") :
      filter === "forecast" ? (m.actual === "" && m.forecast !== "") : true;
    const matchSearch = !search ||
      m.task_name.toLowerCase().includes(search.toLowerCase()) ||
      m.task_code.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    all: data.length,
    delayed: data.filter(m => m.variance_days < 0).length,
    hit: data.filter(m => m.actual !== "").length,
    forecast: data.filter(m => m.actual === "" && m.forecast !== "").length,
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "hit", label: "Achieved" },
    { key: "delayed", label: "Delayed" },
    { key: "forecast", label: "Forecast" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Milestone Tracker</h3>
            <p className="text-xs text-slate-400 mt-0.5">Baseline vs Actual / Forecast dates · variance in calendar days</p>
          </div>
          {/* Search */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search milestones…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none w-40"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mt-3">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === f.key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {f.label}
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-md ${filter === f.key ? "bg-white/20" : "bg-slate-100 text-slate-400"}`}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[520px] print:overflow-visible print:max-h-none">
        <table className="w-full min-w-[640px] text-xs">
          <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
            <tr>
              <th className="text-left px-6 py-3 text-slate-400 font-semibold">Code</th>
              <th className="text-left px-3 py-3 text-slate-400 font-semibold">Milestone</th>
              <th className="text-right px-3 py-3 text-slate-400 font-semibold">Baseline</th>
              <th className="text-right px-3 py-3 text-slate-400 font-semibold">Actual</th>
              <th className="text-right px-3 py-3 text-slate-400 font-semibold">Forecast</th>
              <th className="text-right px-3 py-3 text-slate-400 font-semibold">Var.</th>
              <th className="text-right px-6 py-3 text-slate-400 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => (
              <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                <td className="px-6 py-2.5 text-slate-400 font-mono text-[10px]">{m.task_code}</td>
                <td className="px-3 py-2.5 text-slate-700 max-w-xs print:max-w-none">
                  <p className="truncate print:whitespace-normal font-medium">{m.task_name}</p>
                </td>
                <td className="px-3 py-2.5 text-right text-slate-500 font-mono text-[11px]">{m.baseline || "—"}</td>
                <td className="px-3 py-2.5 text-right text-slate-500 font-mono text-[11px]">{m.actual || "—"}</td>
                <td className="px-3 py-2.5 text-right text-slate-500 font-mono text-[11px]">{m.forecast || "—"}</td>
                <td className={`px-3 py-2.5 text-right font-bold text-[11px] ${m.variance_days < 0 ? "text-red-600" : m.variance_days > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                  {m.variance_days > 0 ? `+${m.variance_days}d` : m.variance_days === 0 ? "—" : `${m.variance_days}d`}
                </td>
                <td className="px-6 py-2.5 text-right">
                  <StatusBadge status={m.status} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-slate-400 text-xs">
                  No milestones match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
        <p className="text-[10px] text-slate-400">
          Showing {filtered.length} of {data.length} milestones
        </p>
      </div>
    </div>
  );
}
