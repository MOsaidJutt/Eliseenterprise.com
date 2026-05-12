"use client";
import { useState, useMemo } from "react";
import { GanttData, GanttTask } from "@/lib/api";

interface WBSGroup {
  wbs_id: string;
  wbs_name: string;
  wbs_path: string;
  wbs_level: number;
  tasks: GanttTask[];
  min_start: string;
  max_finish: string;
}

function dateToMs(s: string): number { return s ? new Date(s).getTime() : 0; }

function fmtDate(s: string): string {
  if (!s) return "—";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}-${
    ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]
  }-${String(d.getFullYear()).slice(2)}`;
}

const LW = 460; // left panel fixed width

export default function GanttChart({ data }: { data: GanttData }) {
  const { tasks, project_start, project_end, data_date } = data;
  const [open, setOpen]         = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [levelFilter, setLevelFilter] = useState<number>(99);
  const [search, setSearch]     = useState("");

  const rangeStart = dateToMs(project_start);
  const rangeEnd   = dateToMs(project_end || project_start);
  const rangeDur   = Math.max(rangeEnd - rangeStart, 1);
  const ddMs       = dateToMs(data_date);

  function pct(ms: number) { return Math.max(0, Math.min(100, (ms - rangeStart) / rangeDur * 100)); }

  // Build WBS groups from flat task list
  const wbsGroups = useMemo<WBSGroup[]>(() => {
    const map = new Map<string, WBSGroup>();
    for (const t of tasks) {
      if (!map.has(t.wbs_id)) {
        map.set(t.wbs_id, { wbs_id: t.wbs_id, wbs_name: t.wbs_name, wbs_path: t.wbs_path, wbs_level: t.wbs_level, tasks: [], min_start: "", max_finish: "" });
      }
      const g = map.get(t.wbs_id)!;
      g.tasks.push(t);
      const s = t.planned_start || t.early_start || t.actual_start;
      const f = t.planned_finish || t.early_finish || t.actual_finish;
      if (s && (!g.min_start || s < g.min_start)) g.min_start = s;
      if (f && (!g.max_finish || f > g.max_finish)) g.max_finish = f;
    }
    return [...map.values()].sort((a, b) => a.wbs_path.localeCompare(b.wbs_path));
  }, [tasks]);

  const uniqueLevels = useMemo(
    () => [...new Set(wbsGroups.map(g => g.wbs_level))].sort((a, b) => a - b),
    [wbsGroups]
  );

  // Month markers for timeline header
  const monthMarkers = useMemo(() => {
    const marks: { label: string; left: number }[] = [];
    const cur = new Date(project_start); cur.setDate(1);
    const end = new Date(project_end || project_start);
    const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    for (let i = 0; cur <= end && i < 60; i++, cur.setMonth(cur.getMonth() + 1)) {
      marks.push({ label: `${M[cur.getMonth()]} '${String(cur.getFullYear()).slice(2)}`, left: pct(cur.getTime()) });
    }
    return marks;
  }, [project_start, project_end]);

  function toggle(id: string) {
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const ddLeft = pct(ddMs);
  const sl = search.toLowerCase();

  const visibleGroups = wbsGroups.filter(g => {
    if (levelFilter !== 99 && g.wbs_level > levelFilter) return false;
    if (sl) {
      const nameMatch = g.wbs_name.toLowerCase().includes(sl);
      const taskMatch = g.tasks.some(t => t.name.toLowerCase().includes(sl) || t.code.toLowerCase().includes(sl));
      if (!nameMatch && !taskMatch) return false;
    }
    return true;
  });

  // Shared column styles
  const cell = (w: number | "flex", extra?: React.CSSProperties): React.CSSProperties => ({
    ...(w === "flex" ? { flex: 1, minWidth: 0 } : { width: w, flexShrink: 0 }),
    display: "flex", alignItems: "center",
    borderLeft: "1px solid var(--border)",
    padding: "0 6px",
    overflow: "hidden",
    ...extra,
  });

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(13,27,62,0.06)" }}>

      {/* Expand/collapse header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left transition-colors"
        style={{ borderBottom: open ? "1px solid var(--border)" : "none" }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card2)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <div className="flex items-center gap-3">
          <svg className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <h3 className="font-bold" style={{ fontSize: 14, color: "var(--text-primary)" }}>WBS Gantt Chart</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {tasks.length.toLocaleString()} activities · {wbsGroups.length} WBS nodes
            </p>
          </div>
        </div>
        <span className="rounded-full px-3 py-1" style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
          {open ? "Collapse" : "Expand"}
        </span>
      </button>

      {open && (
        <>
          {/* Controls bar */}
          <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card2)" }}>

            {/* Level filter */}
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Level:</span>
              {uniqueLevels.map(lvl => (
                <button key={lvl} onClick={() => setLevelFilter(lvl)}
                  className="font-semibold px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    fontSize: 10,
                    background: levelFilter === lvl ? "var(--primary)" : "var(--bg-card)",
                    color: levelFilter === lvl ? "#fff" : "var(--text-secondary)",
                    border: `1px solid ${levelFilter === lvl ? "var(--primary)" : "var(--border)"}`,
                    boxShadow: levelFilter === lvl ? "0 2px 8px rgba(30,64,175,0.2)" : "none",
                  }}>L{lvl}</button>
              ))}
              <button onClick={() => setLevelFilter(99)}
                className="font-semibold px-2.5 py-1 rounded-lg transition-all"
                style={{
                  fontSize: 10,
                  background: levelFilter === 99 ? "var(--primary)" : "var(--bg-card)",
                  color: levelFilter === 99 ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${levelFilter === 99 ? "var(--primary)" : "var(--border)"}`,
                  boxShadow: levelFilter === 99 ? "0 2px 8px rgba(30,64,175,0.2)" : "none",
                }}>All</button>
            </div>

            {/* Collapse / Expand all */}
            <div className="flex gap-1">
              {([["Collapse All", () => setCollapsed(new Set(wbsGroups.map(g => g.wbs_id)))], ["Expand All", () => setCollapsed(new Set())]] as [string, () => void][]).map(([lbl, fn]) => (
                <button key={lbl} onClick={fn}
                  className="rounded-lg px-2.5 py-1 transition-colors"
                  style={{ fontSize: 10, color: "var(--text-secondary)", border: "1px solid var(--border)", background: "var(--bg-card)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-raised)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-card)")}>
                  {lbl}
                </button>
              ))}
            </div>

            {/* Search */}
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search WBS / activities…"
              className="rounded-lg outline-none ml-auto"
              style={{ fontSize: 12, padding: "4px 10px", width: 172, border: "1px solid var(--border-md)", background: "var(--bg-card)", color: "var(--text-primary)", fontFamily: "inherit" }}
              onFocus={e => (e.target.style.borderColor = "var(--primary)")}
              onBlur={e => (e.target.style.borderColor = "var(--border-md)")} />

            {/* Legend */}
            <div className="flex items-center gap-3" style={{ fontSize: 10, color: "var(--text-muted)" }}>
              {([["#CBD5E1","Planned"],["#2563EB","Active"],["#EF4444","Critical"],["#059669","Complete"]] as [string,string][]).map(([c, l]) => (
                <span key={l} className="flex items-center gap-1">
                  <span className="inline-block w-3 h-2 rounded-sm" style={{ background: c, opacity: 0.8 }} />{l}
                </span>
              ))}
            </div>
          </div>

          {/* Scrollable table area */}
          <div className="overflow-auto print:overflow-visible" style={{ maxHeight: 560 }}>
            <div style={{ minWidth: 920 }}>

              {/* Column header row */}
              <div className="flex shrink-0"
                style={{ height: 32, borderBottom: "2px solid var(--border)", background: "var(--bg-card2)", position: "sticky", top: 0, zIndex: 20 }}>

                {/* Left panel header */}
                <div className="flex shrink-0" style={{ width: LW, borderRight: "2px solid var(--border)" }}>
                  <div style={{ width: 32, flexShrink: 0 }} />
                  {([
                    { label: "WBS / Code", w: 92 },
                    { label: "Name", w: "flex" as const },
                    { label: "Act.", w: 40 },
                    { label: "Start", w: 72 },
                    { label: "Finish", w: 72 },
                  ] as { label: string; w: number | "flex" }[]).map((col, i) => (
                    <div key={i} style={{
                      ...cell(col.w),
                      fontSize: 9, fontWeight: 700, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: "0.07em",
                    }}>{col.label}</div>
                  ))}
                </div>

                {/* Timeline header */}
                <div className="flex-1 relative overflow-hidden">
                  {monthMarkers.map((m, i) => (
                    <div key={i} className="absolute top-0 bottom-0" style={{ left: `${m.left}%` }}>
                      <div className="absolute inset-y-0 left-0 w-px" style={{ background: "var(--border)" }} />
                      <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: 4, fontSize: 8, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{m.label}</span>
                    </div>
                  ))}
                  {ddLeft > 0 && ddLeft < 100 && (
                    <div className="absolute top-0 bottom-0" style={{ left: `${ddLeft}%`, width: 2, background: "var(--primary)", opacity: 0.65, zIndex: 2 }}>
                      <span style={{ position: "absolute", top: 3, left: 3, fontSize: 7, fontWeight: 700, color: "var(--primary)", whiteSpace: "nowrap" }}>Data Date</span>
                    </div>
                  )}
                </div>
              </div>

              {/* WBS groups + task rows */}
              {visibleGroups.map(group => {
                const isCollapsed = collapsed.has(group.wbs_id);
                const indent = (group.wbs_level - 1) * 10;
                const showTasks = !isCollapsed && (levelFilter === 99 || group.wbs_level === levelFilter);
                const groupTasks = showTasks
                  ? (sl ? group.tasks.filter(t => t.name.toLowerCase().includes(sl) || t.code.toLowerCase().includes(sl)) : group.tasks)
                  : [];
                const wbsS = dateToMs(group.min_start);
                const wbsF = dateToMs(group.max_finish);

                return (
                  <div key={group.wbs_id}>
                    {/* WBS header row */}
                    <div className="flex cursor-pointer transition-colors"
                      style={{ height: 28, borderBottom: "1px solid var(--border)", background: "var(--bg-card2)" }}
                      onClick={() => toggle(group.wbs_id)}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-raised)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-card2)")}
                    >
                      {/* Left panel */}
                      <div className="flex shrink-0" style={{ width: LW, borderRight: "1px solid var(--border)" }}>
                        {/* Chevron */}
                        <div style={{ width: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg className={`w-3 h-3 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-muted)" }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        {/* WBS Code */}
                        <div style={{ ...cell(92), paddingLeft: 6 + indent, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {group.wbs_id}
                        </div>
                        {/* WBS Name */}
                        <div style={{ ...cell("flex"), fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {group.wbs_name || group.wbs_path}
                        </div>
                        {/* Activity count */}
                        <div style={{ ...cell(40), fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", justifyContent: "flex-end" }}>
                          {group.tasks.length}
                        </div>
                        {/* Min start */}
                        <div style={{ ...cell(72), fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {fmtDate(group.min_start)}
                        </div>
                        {/* Max finish */}
                        <div style={{ ...cell(72), fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {fmtDate(group.max_finish)}
                        </div>
                      </div>

                      {/* WBS summary bar */}
                      <div className="flex-1 relative">
                        {wbsS > 0 && wbsF > 0 && (
                          <div className="absolute rounded-sm" style={{ height: 6, top: "50%", transform: "translateY(-50%)", left: `${pct(wbsS)}%`, width: `${Math.max(0.5, pct(wbsF) - pct(wbsS))}%`, background: "var(--border-md)" }} />
                        )}
                        {ddLeft > 0 && ddLeft < 100 && (
                          <div className="absolute top-0 bottom-0 w-px" style={{ left: `${ddLeft}%`, background: "var(--primary)", opacity: 0.12 }} />
                        )}
                      </div>
                    </div>

                    {/* Task rows */}
                    {groupTasks.map((t, ti) => {
                      const ps  = dateToMs(t.planned_start);
                      const pf  = dateToMs(t.planned_finish);
                      const as_ = dateToMs(t.actual_start);
                      const af  = dateToMs(t.actual_finish);
                      const es  = dateToMs(t.early_start);
                      const ef  = dateToMs(t.early_finish);
                      const barColor = t.is_critical ? "#EF4444" : t.status === "TK_Complete" ? "#059669" : "#2563EB";
                      const actS = as_ || es;
                      const actF = af || ef || (as_ ? ddMs : 0);

                      return (
                        <div key={t.id} className="flex transition-colors group"
                          style={{ height: 26, borderBottom: "1px solid var(--border)", background: ti % 2 === 0 ? "transparent" : "rgba(0,0,0,0.013)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--primary-light)")}
                          onMouseLeave={e => (e.currentTarget.style.background = ti % 2 === 0 ? "transparent" : "rgba(0,0,0,0.013)")}
                        >
                          {/* Left panel */}
                          <div className="flex shrink-0" style={{ width: LW, borderRight: "1px solid var(--border)" }}>
                            {/* Status dot */}
                            <div style={{ width: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.is_critical ? "#EF4444" : t.status === "TK_Complete" ? "#059669" : t.status === "TK_Active" ? "#2563EB" : "#CBD5E1" }} />
                            </div>
                            {/* Task code */}
                            <div style={{ ...cell(92), paddingLeft: indent + 18, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                              {t.code}
                            </div>
                            {/* Task name */}
                            <div style={{ ...cell("flex"), fontSize: 10, color: "var(--text-primary)", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                              {t.name}
                            </div>
                            {/* % complete */}
                            <div style={{ ...cell(40), fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", justifyContent: "flex-end" }}>
                              {t.pct_complete.toFixed(0)}%
                            </div>
                            {/* Planned start */}
                            <div style={{ ...cell(72), fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                              {fmtDate(t.planned_start)}
                            </div>
                            {/* Planned finish */}
                            <div style={{ ...cell(72), fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                              {fmtDate(t.planned_finish)}
                            </div>
                          </div>

                          {/* Gantt bars */}
                          <div className="flex-1 relative">
                            {/* Planned bar */}
                            {ps > 0 && pf > 0 && (
                              <div className="absolute rounded-sm" style={{ height: 5, top: "50%", transform: "translateY(-50%)", left: `${pct(ps)}%`, width: `${Math.max(0.3, pct(pf) - pct(ps))}%`, background: "#CBD5E1" }} />
                            )}
                            {/* Actual / early bar */}
                            {actS > 0 && (
                              <div className="absolute rounded-sm" style={{
                                height: 9, top: "50%", transform: "translateY(-50%)",
                                left: `${pct(actS)}%`,
                                width: `${Math.max(0.3, pct(Math.max(actF, actS + 86400000)) - pct(actS))}%`,
                                background: barColor,
                                opacity: t.status === "TK_NotStart" ? 0.25 : 0.75,
                              }} />
                            )}
                            {/* Data date line */}
                            {ddLeft > 0 && ddLeft < 100 && (
                              <div className="absolute top-0 bottom-0 w-px" style={{ left: `${ddLeft}%`, background: "var(--primary)", opacity: 0.12 }} />
                            )}
                            {/* Hover tooltip */}
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1.5 rounded-lg px-2 py-1 pointer-events-none z-20 whitespace-nowrap shadow-lg"
                              style={{ background: "var(--bg-nav)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 9, color: "#E2E8F0" }}>
                              <span>{t.pct_complete.toFixed(0)}%</span>
                              {t.is_critical && <span style={{ color: "#F87171", fontWeight: 700 }}>CRITICAL</span>}
                              <span style={{ color: "#64748B" }}>float: {t.total_float_days}d</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {visibleGroups.length === 0 && (
                <div className="py-10 text-center" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {sl ? "No activities match your search." : "No WBS groups at this level."}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
