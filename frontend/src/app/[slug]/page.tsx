"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchCompany, fetchAnalyses, fetchAnalysis, analyzeXerFiles,
  CompanyInfo, AnalysisListItem, AnalysisResult,
  DuplicateAnalysis, DuplicateResponse,
} from "@/lib/api";
import { isLoggedIn, clearToken, getUser } from "@/lib/auth";

type TaggedFile = { file: File; type: "baseline" | "update" };

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Theme colour tokens — switch by isDark
function tk(isDark: boolean) {
  return isDark ? {
    bg:         "#0F172A",
    nav:        "rgba(15,23,42,.96)",
    card:       "rgba(255,255,255,.04)",
    cardHover:  "rgba(255,255,255,.07)",
    cardBorder: "rgba(255,255,255,.09)",
    cardHL:     "rgba(96,165,250,.18)",
    cardHLBorder:"rgba(96,165,250,.35)",
    text:       "#F1F5F9",
    sub:        "#CBD5E1",
    muted:      "#64748B",
    faint:      "#334155",
    border:     "rgba(255,255,255,.08)",
    input:      "#1E293B",
    progress:   "rgba(255,255,255,.08)",
    dropBorder: "rgba(255,255,255,.12)",
    kpiCard:    "rgba(255,255,255,.04)",
  } : {
    bg:         "#F1F5F9",
    nav:        "rgba(248,250,252,.96)",
    card:       "#FFFFFF",
    cardHover:  "#F8FAFC",
    cardBorder: "#E2E8F0",
    cardHL:     "#EFF6FF",
    cardHLBorder:"#93C5FD",
    text:       "#0F172A",
    sub:        "#334155",
    muted:      "#64748B",
    faint:      "#94A3B8",
    border:     "#E2E8F0",
    input:      "#F8FAFC",
    progress:   "#E2E8F0",
    dropBorder: "#CBD5E1",
    kpiCard:    "#FFFFFF",
  };
}

export default function CompanyHomePage() {
  const params  = useParams();
  const slug    = params.slug as string;
  const router  = useRouter();
  const user    = getUser();

  const [company,   setCompany]   = useState<CompanyInfo | null>(null);
  const [analyses,  setAnalyses]  = useState<AnalysisListItem[]>([]);
  const [kpis,      setKpis]      = useState<AnalysisResult | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [curIdx,    setCurIdx]    = useState(0);
  const [viewAll,   setViewAll]   = useState(false);
  const [filter,    setFilter]    = useState<"all"|"baseline"|"update">("all");
  const [showUpload,setShowUpload]= useState(false);
  const [dropOpen,  setDropOpen]  = useState(false);
  const [isDark,    setIsDark]    = useState(true);

  // Upload state
  const [files,       setFiles]       = useState<TaggedFile[]>([]);
  const [tab,         setTab]         = useState<"baseline"|"update">("update");
  const [dragging,    setDragging]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [duplicates,  setDuplicates]  = useState<DuplicateAnalysis[]|null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("pv_theme");
    if (saved === "light") setIsDark(false);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("pv_theme", next ? "dark" : "light");
  }

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    Promise.all([fetchCompany(slug), fetchAnalyses({ limit: 50 })])
      .then(([co, res]) => {
        setCompany(co);
        const items = res.items ?? [];
        setAnalyses(items);
        if (items.length > 0) fetchAnalysis(items[0].id).then(setKpis).catch(() => {});
      }).catch(() => {}).finally(() => setLoading(false));
  }, [slug, router]);

  function goTo(idx: number) {
    const n = Math.max(0, Math.min(analyses.length - 1, idx));
    if (n === curIdx) return;
    setCurIdx(n);
    fetchAnalysis(analyses[n].id).then(setKpis).catch(() => {});
  }

  function addFiles(fl: FileList | null) {
    if (!fl) return;
    const xers = Array.from(fl).filter(f => f.name.toLowerCase().endsWith(".xer"));
    if (!xers.length) { setUploadError("Please select .xer files."); return; }
    if (tab === "baseline") { setFiles([{ file: xers[0], type: "baseline" }]); setUploadError(""); return; }
    setFiles(prev => {
      const merged = [...prev, ...xers.map(f => ({ file: f, type: "update" as const }))];
      return merged.filter((tf, i, a) => a.findIndex(x => x.file.name === tf.file.name) === i).slice(0, 10);
    });
    setUploadError("");
  }

  function toggleTag(name: string) {
    setFiles(prev => prev.map(tf => tf.file.name === name ? { ...tf, type: tf.type === "baseline" ? "update" : "baseline" } : tf));
  }

  async function handleAnalyze(force = false) {
    if (!files.length) { setUploadError("Select at least one XER file."); return; }
    setUploading(true); setUploadError("");
    const eff = files.some(tf => tf.type === "baseline") ? "baseline" : "update";
    try {
      const res = await analyzeXerFiles(files.map(tf => tf.file), eff, "", force);
      if ("duplicate" in res && res.duplicate) {
        setDuplicates((res as DuplicateResponse).duplicate_analyses);
        setUploading(false); return;
      }
      const a = res as AnalysisResult;
      sessionStorage.setItem("analysisResult", JSON.stringify(a));
      const aid = (a as any).analysis_id;
      if (aid) { sessionStorage.setItem("analysisId", String(aid)); router.push(`/${slug}/dashboard/${aid}`); }
      else router.push(`/${slug}/dashboard`);
    } catch (e) { setUploadError(e instanceof Error ? e.message : "Failed"); setUploading(false); }
  }

  const t = tk(isDark);
  const greeting = new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening";
  const card = analyses[curIdx];
  const filtered = analyses.filter(a => filter === "all" || a.file_type === filter);
  const k = kpis?.kpis;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${t.border}`, borderTopColor: "#60A5FA", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", transition: "background .2s" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* ── Nav ── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 40px", borderBottom: `1px solid ${t.border}`, position: "sticky", top: 0, zIndex: 30, background: t.nav, backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, background: "#1E40AF", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#fff" }}>P</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{company?.name || "Plainview"}</span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {(["Home","Analytics","AI Chat"] as const).map(lbl => (
            <button key={lbl} onClick={() => { if (lbl === "Analytics" && card) router.push(`/${slug}/dashboard/${card.id}`); if (lbl === "AI Chat" && card) router.push(`/${slug}/dashboard/${card.id}`); }} style={{ fontSize: 12, color: lbl === "Home" ? "#3B82F6" : t.muted, padding: "6px 13px", borderRadius: 8, background: lbl === "Home" ? (isDark ? "rgba(59,130,246,.12)" : "#EFF6FF") : "transparent", border: "none", cursor: "pointer", fontWeight: lbl === "Home" ? 600 : 500 }}>{lbl}</button>
          ))}
          {user?.role === "admin" && <button onClick={() => router.push("/admin")} style={{ fontSize: 12, color: t.muted, padding: "6px 13px", borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", fontWeight: 500 }}>Admin</button>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Theme toggle */}
          <button onClick={toggleTheme} title="Toggle theme" style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.border}`, background: t.card, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.muted }}>
            {isDark
              ? <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
              : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            }
          </button>
          <button onClick={() => setShowUpload(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#1E40AF", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Upload XER
          </button>
          <button onClick={() => { clearToken(); router.replace("/login"); }} title="Sign out" style={{ width: 30, height: 30, borderRadius: "50%", background: isDark ? "#1E3A8A" : "#DBEAFE", border: `2px solid ${isDark ? "#1E40AF" : "#93C5FD"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: isDark ? "#93C5FD" : "#1E40AF", cursor: "pointer" }}>
            {(user?.name || user?.email || "U")[0].toUpperCase()}
          </button>
        </div>
      </nav>

      {/* ── Hero + KPIs (hidden in view-all) ── */}
      {!viewAll && (
        <>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 40px 24px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: isDark ? "rgba(96,165,250,.1)" : "#EFF6FF", border: `1px solid ${isDark ? "rgba(96,165,250,.2)" : "#BFDBFE"}`, borderRadius: 20, padding: "4px 12px", marginBottom: 14 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 11, color: "#3B82F6", fontWeight: 600 }}>{analyses.length} {analyses.length === 1 ? "analysis" : "analyses"} loaded</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: t.text, marginBottom: 4 }}>Good {greeting}, {user?.name?.split(" ")[0] || "there"}.</h1>
            <p style={{ fontSize: 13, color: t.muted }}>{company?.name || slug} · Programme Health Overview</p>
          </div>

          {/* KPI strip */}
          {k && (
            <div style={{ maxWidth: 1100, margin: "0 auto 28px", padding: "0 40px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {[
                { val: `${k.overall_pct_complete}%`, lbl: "Overall Progress",  accent: "#3B82F6",  sub: `${k.total_activities?.toLocaleString()} activities` },
                { val: String(k.spi),               lbl: "Schedule SPI",      accent: k.spi >= 1 ? "#34D399" : "#F87171", sub: k.spi >= 1 ? "On schedule" : "Behind rate" },
                { val: `${k.critical_path_risk_pct}%`, lbl: "Critical Risk",  accent: "#F59E0B",  sub: `${k.critical_activities?.toLocaleString()} activities` },
                { val: k.forecast_end || "—",        lbl: "Forecast End",     accent: "#A78BFA",  sub: k.delay_days > 0 ? `${k.delay_days}d behind` : "On track" },
              ].map(s => (
                <div key={s.lbl} style={{ background: t.kpiCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden", boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,.06)" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.accent }} />
                  <div style={{ fontSize: 24, fontWeight: 800, color: t.text, marginBottom: 3 }}>{s.val}</div>
                  <div style={{ fontSize: 9, color: t.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.lbl}</div>
                  <div style={{ fontSize: 10, color: t.faint, marginTop: 4 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Carousel / View All ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: `${viewAll ? "32px" : "0"} 40px 48px` }}>

        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {viewAll ? "All Analyses" : "Latest Analysis"}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {viewAll && (
              <div style={{ display: "flex", gap: 3 }}>
                {(["all","update","baseline"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ fontSize: 11, fontWeight: 600, padding: "4px 11px", borderRadius: 7, cursor: "pointer", border: `1px solid ${filter === f ? "rgba(96,165,250,.3)" : "transparent"}`, background: filter === f ? (isDark ? "rgba(96,165,250,.12)" : "#EFF6FF") : "transparent", color: filter === f ? "#3B82F6" : t.muted }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            )}

            {/* Dropdown */}
            {!viewAll && analyses.length > 1 && (
              <div style={{ position: "relative" }}>
                <button onClick={() => setDropOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: t.muted, background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: "5px 11px", cursor: "pointer" }}>
                  <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {card?.project_name}
                  </span>
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                </button>
                {dropOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, width: 320, background: isDark ? "#1E293B" : "#FFFFFF", border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", zIndex: 40, boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
                    {analyses.map((a, i) => (
                      <button key={a.id} onClick={() => { goTo(i); setDropOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", background: i === curIdx ? (isDark ? "rgba(96,165,250,.1)" : "#EFF6FF") : "transparent", border: "none", borderBottom: `1px solid ${t.border}`, cursor: "pointer", textAlign: "left", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 2 }}>{a.project_name}</div>
                          <div style={{ fontSize: 10, color: t.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.filenames[0]}
                            {a.data_date && <span style={{ color: t.faint }}> · {a.data_date}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0, background: a.file_type === "baseline" ? (isDark ? "rgba(52,211,153,.12)" : "#DCFCE7") : (isDark ? "rgba(96,165,250,.12)" : "#DBEAFE"), color: a.file_type === "baseline" ? "#34D399" : "#3B82F6" }}>{a.file_type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setViewAll(v => !v)} style={{ fontSize: 11, fontWeight: 600, padding: "5px 13px", borderRadius: 8, border: `1px solid ${t.border}`, background: viewAll ? (isDark ? "rgba(96,165,250,.1)" : "#EFF6FF") : t.card, color: viewAll ? "#3B82F6" : t.muted, cursor: "pointer" }}>
              {viewAll ? "← Back" : "View All"}
            </button>
          </div>
        </div>

        {/* ── THREE-CARD CAROUSEL ── */}
        {!viewAll && analyses.length > 0 && card && (
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}
            onWheel={e => { e.preventDefault(); e.deltaY > 0 ? goTo(curIdx + 1) : goTo(curIdx - 1); }}>

            {/* Left (older) */}
            <div style={{ flex: "0 0 26%", opacity: curIdx < analyses.length - 1 ? 0.38 : 0, pointerEvents: curIdx < analyses.length - 1 ? "auto" : "none", cursor: "pointer", transform: "scale(0.92)", transformOrigin: "right center", transition: "all .3s" }}
              onClick={() => goTo(curIdx + 1)}>
              {analyses[curIdx + 1] && <MiniCard a={analyses[curIdx + 1]} t={t} isDark={isDark} />}
            </div>

            {/* Center (current — highlighted) */}
            <div style={{ flex: "0 0 48%", background: isDark ? "rgba(255,255,255,.05)" : "#FFFFFF", border: `1px solid ${isDark ? "rgba(96,165,250,.3)" : "#93C5FD"}`, borderRadius: 20, padding: "24px 26px", cursor: "pointer", boxShadow: isDark ? "0 0 40px rgba(30,64,175,.2)" : "0 8px 40px rgba(30,64,175,.12)", transition: "all .3s" }}
              onClick={() => router.push(`/${slug}/dashboard/${card.id}`)}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: card.file_type === "baseline" ? (isDark ? "rgba(52,211,153,.12)" : "#DCFCE7") : (isDark ? "rgba(96,165,250,.12)" : "#DBEAFE"), color: card.file_type === "baseline" ? "#34D399" : "#3B82F6" }}>
                      {card.file_type.toUpperCase()}
                    </span>
                    {curIdx === 0 && <span style={{ fontSize: 9, fontWeight: 700, color: "#34D399", background: isDark ? "rgba(52,211,153,.1)" : "#DCFCE7", padding: "2px 7px", borderRadius: 20 }}>LATEST</span>}
                    <span style={{ fontSize: 10, color: t.muted }}>{timeAgo(card.created_at)}</span>
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: t.text, marginBottom: 3 }}>{card.project_name}</h3>
                  <p style={{ fontSize: 11, color: t.muted }}>
                    {card.filenames[0]}
                    {card.data_date && <span style={{ color: t.faint }}> · {card.data_date}</span>}
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6", background: isDark ? "rgba(96,165,250,.1)" : "#EFF6FF", padding: "7px 14px", borderRadius: 10, flexShrink: 0, whiteSpace: "nowrap" }}>
                  Open →
                </span>
              </div>

              {k && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: t.muted }}>Overall Progress</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#3B82F6" }}>{k.overall_pct_complete}%</span>
                    </div>
                    <div style={{ height: 5, background: t.progress, borderRadius: 99 }}>
                      <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#1E40AF,#3B82F6)", width: `${k.overall_pct_complete}%`, transition: "width .5s" }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
                    {[["SPI", k.spi], ["Critical", k.critical_activities?.toLocaleString()], ["Neg. Float", k.neg_float_activities], ["Forecast", k.forecast_end || "—"]].map(([l, v]) => (
                      <div key={String(l)}>
                        <div style={{ fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{l}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: t.sub }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Dots */}
              {analyses.length > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 16 }}>
                  {analyses.map((_, i) => (
                    <button key={i} onClick={e => { e.stopPropagation(); goTo(i); }} style={{ width: i === curIdx ? 18 : 5, height: 5, borderRadius: 99, background: i === curIdx ? "#3B82F6" : t.progress, border: "none", cursor: "pointer", transition: "all .3s", padding: 0 }} />
                  ))}
                </div>
              )}
            </div>

            {/* Right (newer) */}
            <div style={{ flex: "0 0 26%", opacity: curIdx > 0 ? 0.38 : 0, pointerEvents: curIdx > 0 ? "auto" : "none", cursor: "pointer", transform: "scale(0.92)", transformOrigin: "left center", transition: "all .3s" }}
              onClick={() => goTo(curIdx - 1)}>
              {analyses[curIdx - 1] && <MiniCard a={analyses[curIdx - 1]} t={t} isDark={isDark} />}
            </div>
          </div>
        )}

        {/* ── VIEW ALL GRID ── */}
        {viewAll && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
            {filtered.map(a => (
              <div key={a.id} onClick={() => router.push(`/${slug}/dashboard/${a.id}`)}
                style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: "18px 20px", cursor: "pointer", transition: "all .2s", boxShadow: isDark ? "none" : "0 1px 6px rgba(0,0,0,.06)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#93C5FD"; (e.currentTarget as HTMLDivElement).style.background = t.cardHover; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = t.cardBorder; (e.currentTarget as HTMLDivElement).style.background = t.card; }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: a.file_type === "baseline" ? (isDark ? "rgba(52,211,153,.12)" : "#DCFCE7") : (isDark ? "rgba(96,165,250,.12)" : "#DBEAFE"), color: a.file_type === "baseline" ? "#34D399" : "#3B82F6" }}>{a.file_type.toUpperCase()}</span>
                  <span style={{ fontSize: 10, color: t.faint }}>{timeAgo(a.created_at)}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 3 }}>{a.project_name}</div>
                <div style={{ fontSize: 10, color: t.muted, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.filenames[0]}</div>
                {a.data_date && <div style={{ fontSize: 10, color: t.faint, marginBottom: 12 }}>{a.data_date}</div>}
                <div style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6" }}>Open Dashboard →</div>
              </div>
            ))}
            <div onClick={() => setShowUpload(true)}
              style={{ background: "transparent", border: `2px dashed ${t.dropBorder}`, borderRadius: 16, padding: "32px 20px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 150 }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#93C5FD"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = t.dropBorder; }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={t.faint} strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              <p style={{ fontSize: 12, fontWeight: 600, color: t.muted, marginTop: 8 }}>New Upload</p>
            </div>
          </div>
        )}

        {analyses.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>📂</p>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: t.muted, marginBottom: 6 }}>No analyses yet</h3>
            <p style={{ fontSize: 13, color: t.faint, marginBottom: 18 }}>Upload your first XER file to get started</p>
            <button onClick={() => setShowUpload(true)} style={{ background: "#1E40AF", color: "#fff", border: "none", padding: "9px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Upload XER</button>
          </div>
        )}
      </div>

      {/* ── Upload Modal ── */}
      {showUpload && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.6)", backdropFilter: "blur(6px)" }} onClick={e => { if (e.target === e.currentTarget) { setShowUpload(false); setFiles([]); setUploadError(""); } }}>
          <div style={{ width: "100%", maxWidth: 440, background: isDark ? "#1E293B" : "#FFFFFF", borderRadius: 20, overflow: "hidden", border: `1px solid ${t.border}`, boxShadow: "0 40px 80px rgba(0,0,0,.4)" }}>
            <div style={{ height: 3, background: "#1E40AF" }} />
            <div style={{ padding: "18px 22px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Upload XER File</h3>
                <p style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>Primavera P6 .xer export</p>
              </div>
              <button onClick={() => { setShowUpload(false); setFiles([]); setUploadError(""); }} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.muted }}>
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ padding: "18px 22px" }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {(["update","baseline"] as const).map(tp => (
                  <button key={tp} onClick={() => setTab(tp)} style={{ flex: 1, padding: "8px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: tab === tp ? (tp === "baseline" ? "#059669" : "#1E40AF") : t.input, color: tab === tp ? "#fff" : t.muted }}>
                    {tp === "update" ? "Update Snapshot" : "Baseline"}
                  </button>
                ))}
              </div>
              <div style={{ border: `2px dashed ${dragging ? "#3B82F6" : t.dropBorder}`, borderRadius: 12, padding: "28px 16px", textAlign: "center", cursor: "pointer", background: dragging ? "rgba(59,130,246,.05)" : "transparent", position: "relative", marginBottom: 12 }}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}>
                <input type="file" multiple={tab !== "baseline"} accept=".xer" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", zIndex: 5 }} onChange={e => addFiles(e.target.files)} />
                <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke={t.faint} strokeWidth={1.5} style={{ margin: "0 auto 8px", display: "block" }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                <p style={{ fontSize: 13, color: t.muted, fontWeight: 600 }}>Click or drag XER files</p>
                <p style={{ fontSize: 11, color: t.faint, marginTop: 3 }}>{tab === "baseline" ? "1 file only" : "Up to 10 files"}</p>
              </div>
              {files.length > 0 && (
                <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 5 }}>
                  {files.map(tf => (
                    <div key={tf.file.name} style={{ display: "flex", alignItems: "center", gap: 8, background: t.input, border: `1px solid ${t.border}`, borderRadius: 9, padding: "7px 11px" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: tf.type === "baseline" ? "#34D399" : "#60A5FA", background: tf.type === "baseline" ? "rgba(52,211,153,.1)" : "rgba(96,165,250,.1)", padding: "2px 5px", borderRadius: 4, fontFamily: "monospace" }}>XER</span>
                      <span style={{ flex: 1, fontSize: 11, color: t.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tf.file.name}</span>
                      <button onClick={() => toggleTag(tf.file.name)} style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, border: "none", cursor: "pointer", background: tf.type === "baseline" ? "rgba(52,211,153,.15)" : "rgba(96,165,250,.15)", color: tf.type === "baseline" ? "#34D399" : "#60A5FA" }}>{tf.type}</button>
                      <button onClick={() => setFiles(p => p.filter(x => x.file.name !== tf.file.name))} style={{ background: "none", border: "none", color: t.faint, cursor: "pointer", fontSize: 16 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {uploadError && <p style={{ fontSize: 11, color: "#F87171", marginBottom: 10, background: "rgba(239,68,68,.08)", padding: "8px 11px", borderRadius: 8 }}>{uploadError}</p>}
              <button onClick={() => handleAnalyze(false)} disabled={uploading || !files.length} style={{ width: "100%", padding: "11px", borderRadius: 11, background: uploading || !files.length ? t.input : "#1E40AF", color: uploading || !files.length ? t.faint : "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: uploading || !files.length ? "not-allowed" : "pointer" }}>
                {uploading ? "Analysing…" : files.length ? `Analyse ${files.length} file${files.length > 1 ? "s" : ""} →` : "Select files above"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Duplicate Modal ── */}
      {duplicates && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.6)", backdropFilter: "blur(6px)" }}>
          <div style={{ width: "100%", maxWidth: 420, background: isDark ? "#1E293B" : "#fff", borderRadius: 18, border: `1px solid ${t.border}`, overflow: "hidden" }}>
            <div style={{ height: 3, background: "#D97706" }} />
            <div style={{ padding: 22 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 6 }}>Files already analysed</h3>
              <p style={{ fontSize: 12, color: t.muted, marginBottom: 16 }}>These analyses already contain the uploaded files.</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setDuplicates(null)} style={{ padding: "8px 16px", borderRadius: 9, background: t.input, color: t.muted, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                <button onClick={() => { setDuplicates(null); handleAnalyze(true); }} style={{ padding: "8px 16px", borderRadius: 9, background: "#DC2626", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Overwrite &amp; Re-analyse</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Small side card for carousel
function MiniCard({ a, t, isDark }: { a: AnalysisListItem; t: ReturnType<typeof tk>; isDark: boolean }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: "18px 16px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: a.file_type === "baseline" ? (isDark ? "rgba(52,211,153,.12)" : "#DCFCE7") : (isDark ? "rgba(96,165,250,.12)" : "#DBEAFE"), color: a.file_type === "baseline" ? "#34D399" : "#3B82F6" }}>{a.file_type.toUpperCase()}</span>
        <span style={{ fontSize: 9, color: t.faint }}>{timeAgo(a.created_at)}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.project_name}</div>
      {a.data_date && <div style={{ fontSize: 10, color: t.muted }}>{a.data_date}</div>}
    </div>
  );
}
