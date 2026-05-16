"use client";
import { useEffect, useState, useMemo } from "react";
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

function tk(isDark: boolean) {
  return isDark ? {
    bg: "#0A1628", nav: "rgba(10,22,40,.96)", card: "rgba(255,255,255,.04)",
    cardBorder: "rgba(255,255,255,.08)", fileBg: "rgba(255,255,255,.03)",
    fileBorder: "rgba(255,255,255,.06)", text: "#F1F5F9", sub: "#94A3B8",
    muted: "#64748B", faint: "#334155", border: "rgba(255,255,255,.08)",
    input: "#1E293B", dropBorder: "rgba(255,255,255,.12)", kpi: "rgba(255,255,255,.06)",
    sectionLabel: "#475569",
  } : {
    bg: "#F0F4F8", nav: "rgba(255,255,255,.96)", card: "#FFFFFF",
    cardBorder: "#E2E8F0", fileBg: "#F8FAFC", fileBorder: "#E9EEF4",
    text: "#0F172A", sub: "#475569", muted: "#64748B", faint: "#94A3B8",
    border: "#E2E8F0", input: "#F8FAFC", dropBorder: "#CBD5E1",
    kpi: "#F1F5F9", sectionLabel: "#94A3B8",
  };
}

function ProjectIcon({ name, isDark }: { name: string; isDark: boolean }) {
  const colors = ["#3B82F6","#8B5CF6","#F59E0B","#10B981","#EF4444","#EC4899"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: 38, height: 38, borderRadius: 10, background: isDark ? `${color}22` : `${color}18`, border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 800, color }}>{name[0]}</span>
    </div>
  );
}

export default function CompanyHomePage() {
  const params = useParams();
  const slug   = params.slug as string;
  const router = useRouter();
  const user   = getUser();

  const [company,     setCompany]     = useState<CompanyInfo | null>(null);
  const [analyses,    setAnalyses]    = useState<AnalysisListItem[]>([]);
  const [projectKPIs, setProjectKPIs] = useState<Map<number, any>>(new Map());
  const [loading,     setLoading]     = useState(true);
  const [showUpload,  setShowUpload]  = useState(false);
  const [isDark,      setIsDark]      = useState(true);

  // Upload state
  const [files,        setFiles]        = useState<TaggedFile[]>([]);
  const [tab,          setTab]          = useState<"baseline"|"update">("update");
  const [dragging,     setDragging]     = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState("");
  const [duplicates,   setDuplicates]   = useState<DuplicateAnalysis[]|null>(null);

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
        // Load KPIs for the latest analysis of each unique project
        const seen = new Set<string>();
        for (const a of items) {
          if (!seen.has(a.project_name)) {
            seen.add(a.project_name);
            fetchAnalysis(a.id).then(r => {
              setProjectKPIs(prev => new Map(prev).set(a.id, r.kpis));
            }).catch(() => {});
          }
        }
      }).catch(() => {}).finally(() => setLoading(false));
  }, [slug, router]);

  // Group analyses by project name
  const projects = useMemo(() => {
    const map = new Map<string, AnalysisListItem[]>();
    for (const a of analyses) {
      if (!map.has(a.project_name)) map.set(a.project_name, []);
      map.get(a.project_name)!.push(a);
    }
    return [...map.entries()].map(([name, items]) => ({ name, items, latestId: items[0].id }));
  }, [analyses]);

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
        setDuplicates((res as DuplicateResponse).duplicate_analyses); setUploading(false); return;
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

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${t.border}`, borderTopColor: "#3B82F6", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", transition: "background .2s" }}>

      {/* ── Nav ── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 40px", borderBottom: `1px solid ${t.border}`, position: "sticky", top: 0, zIndex: 30, background: t.nav, backdropFilter: "blur(12px)" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.name} style={{ height: 28, width: "auto", objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#1E40AF,#3B82F6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#fff", boxShadow: "0 2px 8px rgba(30,64,175,.4)" }}>P</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>Plainview</div>
                <div style={{ fontSize: 10, color: t.muted, lineHeight: 1 }}>{company?.name || slug}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={toggleTheme} title="Toggle theme" style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.border}`, background: t.card, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.muted }}>
            {isDark
              ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
              : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            }
          </button>
          {user?.role === "admin" && (
            <button onClick={() => router.push("/admin")} style={{ fontSize: 12, color: t.muted, padding: "6px 13px", borderRadius: 8, background: "transparent", border: `1px solid ${t.border}`, cursor: "pointer", fontWeight: 500 }}>Admin</button>
          )}
          <button onClick={() => setShowUpload(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#1E40AF", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(30,64,175,.35)" }}>
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Upload XER
          </button>
          <button onClick={() => { clearToken(); router.replace("/login"); }} title="Sign out" style={{ width: 30, height: 30, borderRadius: "50%", background: isDark ? "#1E3A8A" : "#DBEAFE", border: `2px solid ${isDark ? "#1E40AF" : "#93C5FD"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: isDark ? "#93C5FD" : "#1E40AF", cursor: "pointer" }}>
            {(user?.name || user?.email || "U")[0].toUpperCase()}
          </button>
        </div>
      </nav>

      {/* ── Page header ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 40px 20px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: t.text, marginBottom: 4 }}>
          Good {greeting}, {user?.name?.split(" ")[0] || "there"}.
        </h1>
        <p style={{ fontSize: 13, color: t.muted }}>{projects.length} project{projects.length !== 1 ? "s" : ""} · {analyses.length} analyses loaded</p>
      </div>

      {/* ── Summary strip ── */}
      <div style={{ maxWidth: 900, margin: "0 auto 28px", padding: "0 40px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { val: String(projects.length),                                         lbl: "Projects",         accent: "#3B82F6" },
          { val: String(analyses.length),                                         lbl: "Analyses",         accent: "#8B5CF6" },
          { val: analyses.length > 0 ? timeAgo(analyses[0].created_at) : "—",    lbl: "Latest Upload",    accent: "#34D399" },
          { val: analyses.filter(a => a.file_type === "baseline").length + " BL / " + analyses.filter(a => a.file_type === "update").length + " UP", lbl: "File Mix", accent: "#F59E0B" },
        ].map(s => (
          <div key={s.lbl} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "13px 16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.accent }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: t.text, marginBottom: 2 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: t.muted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Project cards ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px 60px", display: "flex", flexDirection: "column", gap: 16 }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.sectionLabel, textTransform: "uppercase", letterSpacing: "0.09em" }}>Recent Projects</span>
        </div>

        {projects.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>📂</p>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: t.muted, marginBottom: 6 }}>No analyses yet</h3>
            <p style={{ fontSize: 13, color: t.faint, marginBottom: 18 }}>Upload your first XER file to get started</p>
            <button onClick={() => setShowUpload(true)} style={{ background: "#1E40AF", color: "#fff", border: "none", padding: "9px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Upload XER</button>
          </div>
        )}

        {projects.map(({ name, items, latestId }) => {
          const k = projectKPIs.get(latestId);
          const latest = items[0];
          const updateCount  = items.filter(a => a.file_type === "update").length;
          const baselineCount= items.filter(a => a.file_type === "baseline").length;

          return (
            <div key={name} style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 18, overflow: "hidden", boxShadow: isDark ? "0 2px 16px rgba(0,0,0,.2)" : "0 2px 16px rgba(0,0,0,.06)" }}>

              {/* Project header */}
              <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <ProjectIcon name={name} isDark={isDark} />
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: t.text, marginBottom: 3 }}>{name}</h2>
                    <p style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>{latest.filenames[0]?.replace(/_/g, " ").replace(".xer", "")}</p>
                    <p style={{ fontSize: 10, color: t.faint }}>
                      {updateCount > 0 && `${updateCount} update${updateCount > 1 ? "s" : ""}`}
                      {updateCount > 0 && baselineCount > 0 && " · "}
                      {baselineCount > 0 && `${baselineCount} baseline`}
                      {" · Last updated "}
                      {timeAgo(latest.created_at)}
                    </p>
                  </div>
                </div>
                <button onClick={() => router.push(`/${slug}/dashboard/${latestId}`)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#3B82F6", background: isDark ? "rgba(59,130,246,.1)" : "#EFF6FF", border: `1px solid ${isDark ? "rgba(59,130,246,.2)" : "#BFDBFE"}`, borderRadius: 9, padding: "7px 14px", cursor: "pointer", flexShrink: 0 }}>
                  Open Project
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>

              {/* KPI row */}
              {k ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: t.border, margin: "0 0 0 0" }}>
                  {[
                    { val: `${k.overall_pct_complete}%`, lbl: "Progress",  color: "#3B82F6" },
                    { val: String(k.spi),                lbl: "SPI",       color: k.spi >= 1 ? "#10B981" : "#EF4444" },
                    { val: k.critical_activities?.toLocaleString(), lbl: "Critical", color: "#F59E0B" },
                    { val: k.forecast_end || "—",        lbl: "Forecast",  color: t.text },
                  ].map(s => (
                    <div key={s.lbl} style={{ background: t.kpi, padding: "12px 20px" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.val}</div>
                      <div style={{ fontSize: 9, color: t.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.lbl}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: t.kpi, padding: "12px 20px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${t.border}`, borderTopColor: "#3B82F6", animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 11, color: t.muted }}>Loading metrics…</span>
                </div>
              )}

              {/* Schedule files */}
              <div style={{ padding: "14px 24px 18px" }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: t.sectionLabel, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Schedule Files</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {items.map(a => (
                    <div key={a.id} onClick={() => router.push(`/${slug}/dashboard/${a.id}`)} style={{ display: "flex", alignItems: "center", gap: 10, background: t.fileBg, border: `1px solid ${t.fileBorder}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", transition: "all .15s", minWidth: 200, flex: "1 1 200px" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#93C5FD"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = t.fileBorder; }}>
                      <svg width="14" height="16" fill="none" viewBox="0 0 24 24" stroke={t.faint} strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: a.file_type === "baseline" ? (isDark ? "rgba(16,185,129,.15)" : "#DCFCE7") : (isDark ? "rgba(59,130,246,.15)" : "#DBEAFE"), color: a.file_type === "baseline" ? "#10B981" : "#3B82F6" }}>
                            {a.file_type.charAt(0).toUpperCase() + a.file_type.slice(1)}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: t.muted }}>
                          Data date <span style={{ fontWeight: 600, color: t.sub }}>{a.data_date || timeAgo(a.created_at)}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6", whiteSpace: "nowrap" }}>View →</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Upload button */}
        {projects.length > 0 && (
          <button onClick={() => setShowUpload(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "transparent", border: `2px dashed ${t.dropBorder}`, borderRadius: 16, padding: "16px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: t.muted, transition: "all .2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#93C5FD"; (e.currentTarget as HTMLButtonElement).style.color = "#3B82F6"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = t.dropBorder; (e.currentTarget as HTMLButtonElement).style.color = t.muted; }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
            Upload New XER Snapshot
          </button>
        )}
      </div>

      {/* ── Upload Modal ── */}
      {showUpload && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.65)", backdropFilter: "blur(6px)" }} onClick={e => { if (e.target === e.currentTarget) { setShowUpload(false); setFiles([]); setUploadError(""); } }}>
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
                      <span style={{ fontSize: 9, fontWeight: 700, color: tf.type === "baseline" ? "#10B981" : "#3B82F6", background: tf.type === "baseline" ? "rgba(16,185,129,.1)" : "rgba(59,130,246,.1)", padding: "2px 5px", borderRadius: 4, fontFamily: "monospace" }}>XER</span>
                      <span style={{ flex: 1, fontSize: 11, color: t.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tf.file.name}</span>
                      <button onClick={() => toggleTag(tf.file.name)} style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, border: "none", cursor: "pointer", background: tf.type === "baseline" ? "rgba(16,185,129,.15)" : "rgba(59,130,246,.15)", color: tf.type === "baseline" ? "#10B981" : "#3B82F6" }}>{tf.type}</button>
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

      {/* Duplicate modal */}
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

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
