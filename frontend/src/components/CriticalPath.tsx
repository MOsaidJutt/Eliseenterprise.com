"use client";
import { useState } from "react";
import { CriticalActivity } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  TK_Complete: "Complete",
  TK_Active: "In Progress",
  TK_NotStart: "Not Started",
};

const STATUS_STYLE: Record<string, string> = {
  TK_Complete: "bg-emerald-50 text-emerald-700",
  TK_Active: "bg-blue-50 text-blue-700",
  TK_NotStart: "bg-slate-100 text-slate-600",
};

function FloatBadge({ days }: { days: number }) {
  const color = days < -10 ? "bg-red-100 text-red-700" : days < 0 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`inline-block px-2 py-0.5 rounded-lg font-bold text-[11px] font-mono ${color}`}>{days}d</span>;
}

function ProgressBar({ pct }: { pct: number }) {
  const p = parseFloat(String(pct)) || 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-slate-400 rounded-full" style={{ width: `${p}%` }} />
      </div>
      <span className="text-[11px] text-slate-500 font-mono w-7">{p}%</span>
    </div>
  );
}

export default function CriticalPath({ data }: { data: CriticalActivity[] }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? data : data.slice(0, 20);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Critical Path Activities</h3>
          <p className="text-xs text-slate-400 mt-0.5">Activities with total float ≤ 0 days — sorted by most critical first</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          {data.length.toLocaleString()} critical
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[640px] text-xs">
          <thead className="border-b border-slate-100">
            <tr className="bg-slate-50/50">
              <th className="text-left px-6 py-3 text-slate-400 font-semibold">Code</th>
              <th className="text-left px-3 py-3 text-slate-400 font-semibold">Activity Name</th>
              <th className="text-right px-3 py-3 text-slate-400 font-semibold">Total Float</th>
              <th className="text-right px-3 py-3 text-slate-400 font-semibold whitespace-nowrap">% Complete</th>
              <th className="text-right px-3 py-3 text-slate-400 font-semibold whitespace-nowrap">Forecast Finish</th>
              <th className="text-right px-6 py-3 text-slate-400 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((a, i) => (
              <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                <td className="px-6 py-2.5 text-slate-400 font-mono text-[10px]">{a.task_code}</td>
                <td className="px-3 py-2.5 text-slate-700 max-w-xs print:max-w-none">
                  <p className="truncate print:whitespace-normal font-medium">{a.task_name}</p>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <FloatBadge days={a.total_float_days} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <ProgressBar pct={parseFloat(a.pct_complete)} />
                </td>
                <td className="px-3 py-2.5 text-right text-slate-500 font-mono text-[11px]">{a.forecast_end || "—"}</td>
                <td className="px-6 py-2.5 text-right">
                  <span className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-semibold ${STATUS_STYLE[a.status] || "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABEL[a.status] || a.status}
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">No critical activities found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Show more */}
      {data.length > 20 && (
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            Showing {displayed.length} of {data.length} critical activities
          </p>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-slate-600 font-semibold hover:text-slate-900 transition-colors"
          >
            {showAll ? "Show less" : `Show all ${data.length}`}
          </button>
        </div>
      )}
    </div>
  );
}
