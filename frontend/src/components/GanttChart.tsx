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

  const [chartOpen, setChartOpen] = useState(false);
  const [collapsedWbs, setCollapsedWbs] = useState<Set<string>>(new Set());
  const [levelFilter, setLevelFilter] = useState<number>(1);
  const [search, setSearch] = useState("");

  const rangeStart = dateToMs(project_start);
  const rangeEnd   = dateToMs(project_end || project_start);
  const rangeDur   = Math.max(rangeEnd - rangeStart, 1);
  const ddMs       = dateToMs(data_date);

  function pct(ms: number) { return Math.max(0, Math.min(100, (ms - rangeStart) / rangeDur * 100)); }

  const uniqueLevels = useMemo(() => {
    const lvls = [...new Set(tasks.map((t) => t.wbs_level))].sort((a, b) => a - b);
    return lvls;
  }, [tasks]);

  const maxWbsLevel = uniqueLevels[uniqueLevels.length - 1] ?? 1;

  const visible = useMemo(() => {
    return tasks.filter((t) => {
      if (t.wbs_level > levelFilter) return false;
      if (collapsedWbs.has(t.wbs_id)) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.code.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, collapsedWbs, search, levelFilter]);

  function toggleWbs(wbsId: string) {
    setCollapsedWbs((prev) => {
      const next = new Set(prev);
      if (next.has(wbsId)) next.delete(wbsId);
      else next.add(wbsId);
      return next;
    });
  }

  function collapseAll() { setCollapsedWbs(new Set(tasks.map((t) => t.wbs_id))); }
  function expandAll()   { setCollapsedWbs(new Set()); }

  function TaskBar({ t }: { t: GanttTask }) {
    const ps  = dateToMs(t.planned_start);
    const pf  = dateToMs(t.planned_finish);
    const as_ = dateToMs(t.actual_start);
    const af  = dateToMs(t.actual_finish);
    const es  = dateToMs(t.early_start);
    const ef  = dateToMs(t.early_finish);

    const barsOk   = ps && pf && pf > ps;
    const actualOk = as_ && (af || es);

    const barColor = t.is_critical ? "#EF4444" : t.status === "TK_Complete" ? "#059669" : "#2563EB";

    return (
      <div className="relative h-5">
        {barsOk && (
          <div className="absolute h-2 top-1.5 rounded-sm"
            style={{ left: `${pct(ps)}%`, width: `${pct(pf) - pct(ps)}%`, background: "var(--border-md)" }} />
        )}
        {actualOk && (
          <div className="absolute h-3.5 top-0.5 rounded-sm"
            style={{
              left: `${pct(as_)}%`,
              width: `${Math.max(0.4, pct(af || ef || (ddMs > as_ ? ddMs : as_ + 86400000)) - pct(as_))}%`,
              background: barColor,
              opacity: t.status === "TK_NotStart" ? 0.35 : 0.85,
            }} />
        )}
        {!actualOk && es && ef && (
          <div className="absolute h-2 top-1.5 rounded-sm"
            style={{
              left: `${pct(es)}%`,
              width: `${Math.max(0.4, pct(ef) - pct(es))}%`,
              background: t.is_critical ? "rgba(239,68,68,0.15)" : "rgba(37,99,235,0.12)",
              border: `1px solid ${t.is_critical ? "rgba(239,68,68,0.35)" : "rgba(37,99,235,0.25)"}`,
            }} />
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
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(13,27,62,0.06)" }}>

      {/* Section header */}
      <button
        onClick={() => setChartOpen((o) => !o)}
        className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left transition-colors"
        style={{ borderBottom: chartOpen ? "1px solid var(--border)" : "none" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <div className="flex items-center gap-3">
          <svg className={`w-4 h-4 transition-transform duration-200 ${chartOpen ? "rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <h3 className="font-bold" style={{ fontSize: 14, color: "var(--text-primary)" }}>WBS Gantt Chart</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {tasks.length} activities · {visible.length} shown at Level {levelFilter}
            </p>
          </div>
        </div>
        <span className="rounded-full px-3 py-1" style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
          {chartOpen ? "Collapse" : "Expand"}
        </span>
      </button>

      {chartOpen && (
        <>
          {/* Controls */}
          <div className="px-6 py-3 flex items-center gap-3 flex-wrap" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card2)" }}>

            {/* Level filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold uppercase tracking-wide mr-1" style={{ fontSize: 10, color: "var(--text-muted)" }}>Level:</span>
              {uniqueLevels.map((lvl) => (
                <button key={lvl} onClick={() => setLevelFilter(lvl)}
                  className="font-semibold px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    fontSize: 10,
                    background: levelFilter === lvl ? "var(--primary)" : "var(--bg-card)",
                    color: levelFilter === lvl ? "#fff" : "var(--text-secondary)",
                    border: `1px solid ${levelFilter === lvl ? "var(--primary)" : "var(--border)"}`,
                    boxShadow: levelFilter === lvl ? "0 2px 8px rgba(30,64,175,0.2)" : "none",
                  }}>
                  L{lvl}
                </button>
              ))}
              <button onClick={() => setLevelFilter(maxWbsLevel + 1)}
                className="font-semibold px-2.5 py-1 rounded-lg transition-all"
                style={{
                  fontSize: 10,
                  background: levelFilter > maxWbsLevel ? "var(--primary)" : "var(--bg-card)",
                  color: levelFilter > maxWbsLevel ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${levelFilter > maxWbsLevel ? "var(--primary)" : "var(--border)"}`,
                  boxShadow: levelFilter > maxWbsLevel ? "0 2px 8px rgba(30,64,175,0.2)" : "none",
                }}>
                All
              </button>
            </div>

            {/* Collapse / Expand */}
            <div className="flex items-center gap-1">
              <button onClick={collapseAll} className="rounded-lg px-2.5 py-1 transition-colors"
                style={{ fontSize: 10, color: "var(--text-secondary)", border: "1px solid var(--border)", background: "var(--bg-card)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-raised)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-card)")}>
                Collapse All
              </button>
              <button onClick={expandAll} className="rounded-lg px-2.5 py-1 transition-colors"
                style={{ fontSize: 10, color: "var(--text-secondary)", border: "1px solid var(--border)", background: "var(--bg-card)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-raised)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-card)")}>
                Expand All
              </button>
            </div>

            {/* Search */}
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activities…"
              className="rounded-lg outline-none ml-auto"
              style={{
                fontSize: 12, padding: "6px 12px", width: 176,
                border: "1px solid var(--border-md)", background: "var(--bg-card)",
                color: "var(--text-primary)", fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border-md)")}
            />

            {/* Legend */}
            <div className="flex items-center gap-3" style={{ fontSize: 10, color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-1.5 rounded-sm" style={{ background: "var(--border-md)" }} />Planned
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-2 rounded-sm" style={{ background: "#2563EB", opacity: 0.8 }} />Actual
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-2 rounded-sm" style={{ background: "#EF4444", opacity: 0.8 }} />Critical
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="overflow-x-auto">
            <div style={{ minWidth: 900 }}>
              {/* Timeline header */}
              <div className="flex" style={{ height: 28, borderBottom: "1px solid var(--border)", background: "var(--bg-card2)" }}>
                <div className="shrink-0" style={{ width: 256, borderRight: "1px solid var(--border)" }} />
                <div className="flex-1 relative">
                  {monthMarkers.map((m, i) => (
                    <div key={i} className="absolute top-0 bottom-0 flex items-center" style={{ left: `${m.left}%` }}>
                      <span style={{ fontSize: 9, color: "var(--text-muted)", paddingLeft: 4, whiteSpace: "nowrap" }}>{m.label}</span>
                      <div className="absolute top-0 bottom-0 left-0 w-px" style={{ background: "var(--border)" }} />
                    </div>
                  ))}
                  {ddLeft > 0 && ddLeft < 100 && (
                    <div className="absolute top-0 bottom-0 z-10" style={{ left: `${ddLeft}%`, width: 2, background: "var(--primary)", opacity: 0.6 }}>
                      <span className="absolute -top-0 left-1 font-bold whitespace-nowrap" style={{ fontSize: 8, color: "var(--primary)" }}>Data Date</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rows */}
              <div>
                {(() => {
                  let lastWbs = "";
                  const rows: React.ReactNode[] = [];
                  for (const t of visible) {
                    if (t.wbs_id !== lastWbs) {
                      lastWbs = t.wbs_id;
                      const isCollapsed = collapsedWbs.has(t.wbs_id);
                      const wbsCount = tasks.filter((x) => x.wbs_id === t.wbs_id && x.wbs_level <= levelFilter).length;
                      rows.push(
                        <div key={`wbs-${t.wbs_id}`} onClick={() => toggleWbs(t.wbs_id)}
                          className="flex items-center cursor-pointer transition-colors"
                          style={{ height: 26, borderBottom: "1px solid var(--border)", background: "var(--bg-card2)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-raised)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-card2)")}>
                          <div className="shrink-0 px-3 flex items-center gap-1.5" style={{ width: 256, borderRight: "1px solid var(--border)" }}>
                            <svg className={`w-3 h-3 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-muted)" }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="font-bold truncate" style={{ fontSize: 10, color: "var(--text-secondary)" }}>{t.wbs_name || t.wbs_path}</span>
                            <span className="shrink-0" style={{ fontSize: 9, color: "var(--text-muted)" }}>({wbsCount})</span>
                          </div>
                          <div className="flex-1 relative" style={{ height: 26 }} />
                        </div>
                      );
                    }

                    rows.push(
                      <div key={t.id} className="flex items-center group transition-colors"
                        style={{ height: 32, borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <div className="shrink-0 px-3 flex items-center gap-2" style={{ width: 256, borderRight: "1px solid var(--border)" }}>
                          <div className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: t.is_critical ? "#EF4444" : t.status === "TK_Complete" ? "#059669" : t.status === "TK_Active" ? "#2563EB" : "#CBD5E1" }} />
                          <div className="min-w-0">
                            <p className="font-medium truncate leading-tight" style={{ fontSize: 10, color: "var(--text-primary)" }}>{t.name}</p>
                            <p style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "monospace" }}>{t.code}</p>
                          </div>
                        </div>
                        <div className="flex-1 px-1 relative">
                          <TaskBar t={t} />
                          {ddLeft > 0 && ddLeft < 100 && (
                            <div className="absolute top-0 bottom-0 w-px pointer-events-none"
                              style={{ left: `${ddLeft}%`, background: "var(--primary)", opacity: 0.2 }} />
                          )}
                        </div>
                        <div className="absolute right-2 hidden group-hover:flex items-center gap-2 rounded-lg px-2 py-1 pointer-events-none z-20 whitespace-nowrap shadow-lg"
                          style={{ background: "var(--bg-nav)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 9, color: "#E2E8F0" }}>
                          <span>{t.pct_complete.toFixed(0)}% · {STATUS_LABEL[t.status] ?? t.status}</span>
                          {t.is_critical && <span style={{ color: "#F87171", fontWeight: 700 }}>CRITICAL</span>}
                          <span style={{ color: "#64748B" }}>{t.total_float_days}d float</span>
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
            <div className="py-10 text-center" style={{ fontSize: 14, color: "var(--text-muted)" }}>
              {search ? "No activities match your search." : "No activities at this level."}
            </div>
          )}
        </>
      )}
    </div>
  );
}
