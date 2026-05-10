"use client";
import { useState, useMemo } from "react";
import { GanttData, GanttTask } from "@/lib/api";

interface Props { data: GanttData; }

const STATUS_LABEL: Record<string, string> = {
  TK_Complete: "Complete",
  TK_Active:   "Active",
  TK_NotStart: "Not Started",
};

function dateToMs(s: string) { return s ? new Date(s).getTime() : 0; }

export default function GanttChart({ data }: Props) {
  const { tasks, project_start, project_end, data_date } = data;
  const [collapsedWbs, setCollapsedWbs] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const rangeStart = dateToMs(project_start);
  const rangeEnd   = dateToMs(project_end || project_start);
  const rangeDur   = Math.max(rangeEnd - rangeStart, 1);
  const ddMs       = dateToMs(data_date);

  function pct(ms: number) { return Math.max(0, Math.min(100, (ms - rangeStart) / rangeDur * 100)); }

  const visible = useMemo(() => {
    return tasks.filter((t) => {
      if (collapsedWbs.has(t.wbs_id)) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.code.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, collapsedWbs, search]);

  function toggleWbs(wbsId: string) {
    setCollapsedWbs((prev) => {
      const next = new Set(prev);
      if (next.has(wbsId)) next.delete(wbsId);
      else next.add(wbsId);
      return next;
    });
  }

  function TaskBar({ t }: { t: GanttTask }) {
    const ps  = dateToMs(t.planned_start);
    const pf  = dateToMs(t.planned_finish);
    const as_ = dateToMs(t.actual_start);
    const af  = dateToMs(t.actual_finish);
    const es  = dateToMs(t.early_start);
    const ef  = dateToMs(t.early_finish);

    const barsOk  = ps && pf && pf > ps;
    const actualOk = as_ && (af || es);

    return (
      <div className="relative h-5">
        {barsOk && (
          <div
            className="absolute h-2 top-1.5 rounded-sm bg-slate-600/40"
            style={{ left: `${pct(ps)}%`, width: `${pct(pf) - pct(ps)}%` }}
          />
        )}
        {actualOk && (
          <div
            className={`absolute h-3.5 top-0.5 rounded-sm ${t.is_critical ? "bg-red-500" : t.status === "TK_Complete" ? "bg-emerald-500" : "bg-blue-500"}`}
            style={{
              left: `${pct(as_)}%`,
              width: `${Math.max(0.4, pct(af || ef || (ddMs > as_ ? ddMs : as_ + 86400000)) - pct(as_))}%`,
              opacity: t.status === "TK_NotStart" ? 0.35 : 0.8,
            }}
          />
        )}
        {!actualOk && es && ef && (
          <div
            className={`absolute h-2 top-1.5 rounded-sm border ${t.is_critical ? "border-red-500/40 bg-red-500/10" : "border-blue-500/30 bg-blue-500/10"}`}
            style={{ left: `${pct(es)}%`, width: `${Math.max(0.4, pct(ef) - pct(es))}%` }}
          />
        )}
      </div>
    );
  }

  const monthMarkers = useMemo(() => {
    const marks: { label: string; left: number }[] = [];
    const start = new Date(project_start);
    start.setDate(1);
    const end = new Date(project_end || project_start);
    const cur = new Date(start);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    let i = 0;
    while (cur <= end && i < 60) {
      marks.push({ label: `${months[cur.getMonth()]} '${String(cur.getFullYear()).slice(2)}`, left: pct(cur.getTime()) });
      cur.setMonth(cur.getMonth() + 1);
      i++;
    }
    return marks;
  }, [project_start, project_end]);

  const ddLeft = pct(ddMs);

  return (
    <div className="bg-[#0D1829] rounded-2xl border border-white/[0.07] shadow-xl shadow-black/30 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-slate-200">WBS Gantt Chart</h3>
          <p className="text-xs text-slate-500 mt-0.5">{tasks.length} activities · click WBS name to collapse group</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities…"
            className="text-xs bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-1.5 outline-none focus:border-blue-500/40 text-slate-300 placeholder-slate-600 w-44"
          />
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-4 h-1.5 bg-slate-600/50 rounded-sm inline-block" />Planned</span>
            <span className="flex items-center gap-1"><span className="w-4 h-2 bg-blue-500/70 rounded-sm inline-block" />Actual</span>
            <span className="flex items-center gap-1"><span className="w-4 h-2 bg-red-500 rounded-sm inline-block opacity-80" />Critical</span>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 900 }}>
          {/* Timeline header */}
          <div className="flex border-b border-white/[0.06] bg-white/[0.01]" style={{ height: 28 }}>
            <div className="w-64 shrink-0 border-r border-white/[0.06]" />
            <div className="flex-1 relative">
              {monthMarkers.map((m, i) => (
                <div key={i} className="absolute top-0 bottom-0 flex items-center" style={{ left: `${m.left}%` }}>
                  <span className="text-[9px] text-slate-600 pl-1 whitespace-nowrap">{m.label}</span>
                  <div className="absolute top-0 bottom-0 left-0 w-px bg-white/[0.05]" />
                </div>
              ))}
              {ddLeft > 0 && ddLeft < 100 && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500/50 z-10" style={{ left: `${ddLeft}%` }}>
                  <span className="absolute -top-0 left-1 text-[8px] text-blue-400 font-bold whitespace-nowrap">Data Date</span>
                </div>
              )}
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {(() => {
              let lastWbs = "";
              const rows: React.ReactNode[] = [];
              for (const t of visible) {
                if (t.wbs_id !== lastWbs) {
                  lastWbs = t.wbs_id;
                  const isCollapsed = collapsedWbs.has(t.wbs_id);
                  const wbsCount   = tasks.filter((x) => x.wbs_id === t.wbs_id).length;
                  rows.push(
                    <div
                      key={`wbs-${t.wbs_id}`}
                      onClick={() => toggleWbs(t.wbs_id)}
                      className="flex items-center bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer border-b border-white/[0.05] transition-colors"
                      style={{ height: 26 }}
                    >
                      <div className="w-64 shrink-0 px-3 flex items-center gap-1.5 border-r border-white/[0.05]">
                        <svg className={`w-3 h-3 text-slate-500 transition-transform ${isCollapsed ? "" : "rotate-90"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-[10px] font-bold text-slate-400 truncate">{t.wbs_name || t.wbs_path}</span>
                        <span className="text-[9px] text-slate-600 shrink-0">({wbsCount})</span>
                      </div>
                      <div className="flex-1 relative" style={{ height: 26 }} />
                    </div>
                  );
                }

                rows.push(
                  <div key={t.id} className="flex items-center hover:bg-blue-500/[0.03] transition-colors group" style={{ height: 32 }}>
                    <div className="w-64 shrink-0 px-3 border-r border-white/[0.04] flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.is_critical ? "bg-red-500" : t.status === "TK_Complete" ? "bg-emerald-500" : t.status === "TK_Active" ? "bg-blue-500" : "bg-slate-600"}`} />
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium text-slate-400 truncate leading-tight">{t.name}</p>
                        <p className="text-[9px] text-slate-600 font-mono">{t.code}</p>
                      </div>
                    </div>
                    <div className="flex-1 px-1 relative">
                      <TaskBar t={t} />
                      {ddLeft > 0 && ddLeft < 100 && (
                        <div className="absolute top-0 bottom-0 w-px bg-blue-500/20 pointer-events-none" style={{ left: `${ddLeft}%` }} />
                      )}
                    </div>
                    <div className="absolute right-2 hidden group-hover:flex items-center gap-2 bg-[#0A1220] border border-white/[0.1] text-slate-300 text-[9px] px-2 py-1 rounded-lg shadow-2xl pointer-events-none z-20 whitespace-nowrap">
                      <span>{t.pct_complete.toFixed(0)}% · {STATUS_LABEL[t.status] ?? t.status}</span>
                      {t.is_critical && <span className="text-red-400 font-bold">CRITICAL</span>}
                      <span className="text-slate-600">{t.total_float_days}d float</span>
                    </div>
                  </div>
                );
              }
              return rows;
            })()}
          </div>
        </div>
      </div>

      {visible.length === 0 && (
        <div className="py-10 text-center text-sm text-slate-600">No activities match your search.</div>
      )}
    </div>
  );
}
