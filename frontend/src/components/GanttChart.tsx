"use client";
import { useState, useMemo, useRef, useCallback } from "react";
import { GanttData, GanttRow } from "@/lib/api";

const DC = ["#00558B", "#1a7abf", "#2196a8", "#2e9e6b", "#6a4ea8", "#a85e2e", "#2e7d32", "#7b5e00"];
const RH = 26; // row height
const OVERSCAN = 10;
const LW = 460; // left panel fixed width

function dateToMs(s: string): number { return s ? new Date(s).getTime() : 0; }

function fmtDate(s: string): string {
  if (!s) return "—";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}-${
    ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]
  }-${String(d.getFullYear()).slice(2)}`;
}

function isHiddenByAncestor(row: GanttRow, collapsed: Set<string>, byId: Map<string, GanttRow>): boolean {
  let pid = row.parent_id;
  while (pid) {
    if (collapsed.has(pid)) return true;
    const p = byId.get(pid);
    if (!p) break;
    pid = p.parent_id;
  }
  return false;
}

export default function GanttChart({ data }: { data: GanttData }) {
  const { rows, project_start, project_end, data_date } = data;
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const c = new Set<string>();
    for (const r of rows) if (r.type === "wbs" && r.depth >= 2) c.add(r.id);
    return c;
  });
  const [search, setSearch] = useState("");
  const [showMilestones, setShowMilestones] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const rangeStart = dateToMs(project_start);
  const rangeEnd = dateToMs(project_end || project_start);
  const rangeDur = Math.max(rangeEnd - rangeStart, 1);
  const ddMs = dateToMs(data_date);

  const pct = useCallback((ms: number) => Math.max(0, Math.min(100, ((ms - rangeStart) / rangeDur) * 100)), [rangeStart, rangeDur]);
  const ddLeft = pct(ddMs);

  const byId = useMemo(() => {
    const m = new Map<string, GanttRow>();
    for (const r of rows) m.set(r.id, r);
    return m;
  }, [rows]);

  const hasChildren = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) s.add(r.parent_id ?? "");
    return s;
  }, [rows]);

  const wbsRows = useMemo(() => rows.filter((r): r is GanttRow & { type: "wbs" } => r.type === "wbs"), [rows]);
  const taskRows = useMemo(() => rows.filter((r): r is GanttRow & { type: "task" } => r.type === "task"), [rows]);

  // Month markers for timeline header
  const monthMarkers = useMemo(() => {
    const marks: { label: string; left: number }[] = [];
    const cur = new Date(project_start); cur.setDate(1);
    const end = new Date(project_end || project_start);
    const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    for (let i = 0; cur <= end && i < 80; i++, cur.setMonth(cur.getMonth() + 1)) {
      marks.push({ label: `${M[cur.getMonth()]} '${String(cur.getFullYear()).slice(2)}`, left: pct(cur.getTime()) });
    }
    return marks;
  }, [project_start, project_end, pct]);

  const sl = search.trim().toLowerCase();

  // WBS ids that match the search themselves, or have a descendant (wbs or task) that matches
  const searchMatch = useMemo(() => {
    if (!sl) return null;
    const matched = new Set<string>();
    const markAncestors = (id: string | null) => {
      let pid = id;
      while (pid && !matched.has(pid)) {
        matched.add(pid);
        pid = byId.get(pid)?.parent_id ?? null;
      }
    };
    for (const r of rows) {
      if (r.type === "wbs") {
        if (r.name.toLowerCase().includes(sl)) markAncestors(r.id);
      } else {
        if (r.name.toLowerCase().includes(sl) || r.code.toLowerCase().includes(sl)) markAncestors(r.parent_id);
      }
    }
    return matched;
  }, [rows, sl, byId]);

  const effectiveCollapsed = useMemo(() => (sl ? new Set<string>() : collapsed), [sl, collapsed]);

  const visibleRows = useMemo(() => {
    const out: GanttRow[] = [];
    for (const r of rows) {
      if (isHiddenByAncestor(r, effectiveCollapsed, byId)) continue;
      if (r.type === "wbs") {
        if (searchMatch && !searchMatch.has(r.id)) continue;
        out.push(r);
        continue;
      }
      if (!showMilestones || !r.is_mile) continue;
      if (sl && !r.name.toLowerCase().includes(sl) && !r.code.toLowerCase().includes(sl)) continue;
      out.push(r);
    }
    return out;
  }, [rows, effectiveCollapsed, byId, searchMatch, showMilestones, sl]);

  function toggle(id: string) {
    setCollapsed(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function collapseToLevel(lv: number) {
    const n = new Set<string>();
    for (const r of wbsRows) if (r.depth >= lv) n.add(r.id);
    setCollapsed(n);
  }
  function expandAll() { setCollapsed(new Set()); }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setScrollTop(el.scrollTop));
  }

  const viewH = 560;
  const first = Math.max(0, Math.floor(scrollTop / RH) - OVERSCAN);
  const last = Math.min(visibleRows.length - 1, Math.ceil((scrollTop + viewH) / RH) + OVERSCAN);
  const windowRows = visibleRows.slice(first, last + 1);
  const totalH = visibleRows.length * RH;

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
              {taskRows.length.toLocaleString()} activities · {wbsRows.length.toLocaleString()} WBS nodes
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
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Collapse:</span>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(lvl => (
                <button key={lvl} onClick={() => collapseToLevel(lvl)}
                  className="font-semibold px-2.5 py-1 rounded-lg transition-all"
                  style={{ fontSize: 10, background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                  L{lvl}
                </button>
              ))}
              <button onClick={expandAll}
                className="font-semibold px-2.5 py-1 rounded-lg transition-all"
                style={{ fontSize: 10, background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                All
              </button>
            </div>

            {/* Search */}
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search WBS / activities…"
              className="rounded-lg outline-none ml-auto"
              style={{ fontSize: 12, padding: "4px 10px", width: 172, border: "1px solid var(--border-md)", background: "var(--bg-card)", color: "var(--text-primary)", fontFamily: "inherit" }}
              onFocus={e => (e.target.style.borderColor = "var(--primary)")}
              onBlur={e => (e.target.style.borderColor = "var(--border-md)")} />

            {/* Milestones toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              <input type="checkbox" checked={showMilestones} onChange={e => setShowMilestones(e.target.checked)} />
              Show milestones
            </label>

            {/* Legend */}
            <div className="flex items-center gap-3" style={{ fontSize: 10, color: "var(--text-muted)" }}>
              {DC.slice(0, 4).map((c, i) => (
                <span key={c} className="flex items-center gap-1">
                  <span className="inline-block w-3 h-2 rounded-sm" style={{ background: c, opacity: 0.85 }} />L{i + 1}
                </span>
              ))}
            </div>
          </div>

          {/* Scrollable virtualized area */}
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            className="overflow-auto print:overflow-visible"
            style={{ maxHeight: viewH }}
          >
            <div style={{ minWidth: 920 }}>

              {/* Column header row (sticky) */}
              <div className="flex shrink-0"
                style={{ height: 32, borderBottom: "2px solid var(--border)", background: "var(--bg-card2)", position: "sticky", top: 0, zIndex: 20 }}>
                <div className="flex shrink-0" style={{ width: LW, borderRight: "2px solid var(--border)" }}>
                  <div style={{ width: 24, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", padding: "0 6px", fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>WBS Group</div>
                  <div style={{ width: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 6px", fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Tasks</div>
                </div>
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

              {/* Virtualized rows */}
              <div style={{ position: "relative", height: totalH }}>
                {windowRows.map((r, i) => {
                  const idx = first + i;
                  const top = idx * RH;
                  if (r.type === "wbs") {
                    const open_ = !collapsed.has(r.id) || !!sl;
                    const kids = hasChildren.has(r.id);
                    const color = DC[Math.min(r.depth, DC.length - 1)];
                    const rs = dateToMs(r.rollup_start), re = dateToMs(r.rollup_end);
                    const barLeft = pct(rs), barW = Math.max(0.4, pct(re) - barLeft);
                    return (
                      <div key={r.id} className="flex absolute left-0 right-0 cursor-pointer transition-colors group"
                        style={{ top, height: RH, borderBottom: "1px solid var(--border)", background: `${color}14` }}
                        onClick={() => kids && toggle(r.id)}
                      >
                        <div className="flex shrink-0" style={{ width: LW, borderRight: "1px solid var(--border)", borderLeft: `3px solid ${color}` }}>
                          <div style={{ width: 21, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: r.depth * 9 }}>
                            {kids && (
                              <svg className="w-3 h-3 transition-transform" style={{ transform: open_ ? "rotate(90deg)" : "none", color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", padding: "0 6px", overflow: "hidden", fontSize: r.depth === 0 ? 12 : 11, fontWeight: r.depth === 0 ? 800 : r.depth <= 1 ? 700 : 600, color: "var(--text-primary)", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                            {r.name}
                          </div>
                          <div style={{ width: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 6px", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                            {r.rollup_count || ""}
                          </div>
                        </div>
                        <div className="flex-1 relative">
                          {r.rollup_start && r.rollup_end && (
                            <div className="absolute rounded-md flex items-center" style={{ height: 14, top: "50%", transform: "translateY(-50%)", left: `${barLeft}%`, width: `${barW}%`, background: color, opacity: 0.88 }}>
                              {barW > 6 && <span style={{ paddingLeft: 5, fontSize: 9, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden" }}>{r.name}</span>}
                            </div>
                          )}
                          {ddLeft > 0 && ddLeft < 100 && (
                            <div className="absolute top-0 bottom-0 w-px" style={{ left: `${ddLeft}%`, background: "var(--primary)", opacity: 0.12 }} />
                          )}
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1.5 rounded-lg px-2 py-1 pointer-events-none z-20 whitespace-nowrap shadow-lg"
                            style={{ background: "var(--bg-nav)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 9, color: "#E2E8F0" }}>
                            <span>{fmtDate(r.rollup_start)} → {fmtDate(r.rollup_end)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  // Milestone task row
                  const mx = pct(dateToMs(r.start));
                  const mc = r.critical ? "#EF4444" : r.status === "TK_Complete" ? "#059669" : r.status === "TK_Active" ? "#2563EB" : "#94A3B8";
                  return (
                    <div key={r.id} className="flex absolute left-0 right-0 transition-colors group"
                      style={{ top, height: RH, borderBottom: "1px solid var(--border)" }}>
                      <div className="flex shrink-0" style={{ width: LW, borderRight: "1px solid var(--border)" }}>
                        <div style={{ width: 21, flexShrink: 0, paddingLeft: r.depth * 9 }} />
                        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 5, padding: "0 6px", overflow: "hidden", fontSize: 10, color: "var(--text-secondary)", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: mc, flexShrink: 0 }} />
                          {r.name}
                        </div>
                        <div style={{ width: 56, flexShrink: 0 }} />
                      </div>
                      <div className="flex-1 relative">
                        <div className="absolute" style={{ left: `${mx}%`, top: "50%", width: 10, height: 10, marginLeft: -5, marginTop: -5, transform: "rotate(45deg)", background: mc }} />
                        {ddLeft > 0 && ddLeft < 100 && (
                          <div className="absolute top-0 bottom-0 w-px" style={{ left: `${ddLeft}%`, background: "var(--primary)", opacity: 0.12 }} />
                        )}
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1.5 rounded-lg px-2 py-1 pointer-events-none z-20 whitespace-nowrap shadow-lg"
                          style={{ background: "var(--bg-nav)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 9, color: "#E2E8F0" }}>
                          <span>{fmtDate(r.start)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {visibleRows.length === 0 && (
                <div className="py-10 text-center" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  No WBS groups match your search.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
