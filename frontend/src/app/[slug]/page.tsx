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

export default function CompanyHomePage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const user = getUser();

  const [company, setCompany]         = useState<CompanyInfo | null>(null);
  const [analyses, setAnalyses]       = useState<AnalysisListItem[]>([]);
  const [latestKPIs, setLatestKPIs]   = useState<AnalysisResult | null>(null);
  const [loading, setLoading]         = useState(true);
  const [currentIdx, setCurrentIdx]   = useState(0);
  const [viewAll, setViewAll]         = useState(false);
  const [filter, setFilter]           = useState<"all" | "baseline" | "update">("all");
  const [showUpload, setShowUpload]   = useState(false);
  const [dropOpen, setDropOpen]       = useState(false);

  // Upload state
  const [files, setFiles]             = useState<TaggedFile[]>([]);
  const [tab, setTab]                 = useState<"baseline" | "update">("update");
  const [dragging, setDragging]       = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [duplicates, setDuplicates]   = useState<DuplicateAnalysis[] | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    Promise.all([
      fetchCompany(slug),
      fetchAnalyses({ limit: 50 }),
    ]).then(([co, res]) => {
      setCompany(co);
      const items = res.items ?? [];
      setAnalyses(items);
      if (items.length > 0) {
        fetchAnalysis(items[0].id).then(setLatestKPIs).catch(() => {});
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [slug, router]);

  // Filtered list for view-all grid
  const filtered = analyses.filter(a => filter === "all" || a.file_type === filter);
  // Current card in carousel
  const card = analyses[currentIdx];

  function goTo(idx: number) {
    const next = Math.max(0, Math.min(analyses.length - 1, idx));
    setCurrentIdx(next);
    if (next !== currentIdx) {
      fetchAnalysis(analyses[next].id).then(setLatestKPIs).catch(() => {});
    }
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
    const effectiveType = files.some(tf => tf.type === "baseline") ? "baseline" : "update";
    try {
      const res = await analyzeXerFiles(files.map(tf => tf.file), effectiveType, "", force);
      if ("duplicate" in res && res.duplicate) { setDuplicates((res as DuplicateResponse).duplicate_analyses); setUploading(false); return; }
      const analysis = res as AnalysisResult;
      sessionStorage.setItem("analysisResult", JSON.stringify(analysis));
      if ((analysis as any).analysis_id) {
        sessionStorage.setItem("analysisId", String((analysis as any).analysis_id));
        router.push(`/${slug}/dashboard/${(analysis as any).analysis_id}`);
      } else {
        router.push(`/${slug}/dashboard`);
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Analysis failed");
      setUploading(false);
    }
  }

  const kpis = latestKPIs?.kpis;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F172A" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(96,165,250,.2)", borderTopColor: "#60A5FA", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* ── Top Nav ── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 48px", borderBottom: "1px solid rgba(255,255,255,.07)", position: "sticky", top: 0, zIndex: 30, background: "rgba(15,23,42,.95)", backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#1E40AF", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff" }}>P</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>{company?.name || "Plainview"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {[["Home", true], ["Analytics", false], ["AI Chat", false]].map(([lbl, active]) => (
            <button key={String(lbl)} onClick={() => lbl === "Analytics" && card && router.push(`/${slug}/dashboard/${card.id}`)} style={{ fontSize: 12, color: active ? "#93C5FD" : "#64748B", padding: "7px 14px", borderRadius: 8, background: active ? "rgba(96,165,250,.1)" : "transparent", border: "none", cursor: "pointer", fontWeight: 500 }}>{lbl as string}</button>
          ))}
          {user?.role === "admin" && (
            <button onClick={() => router.push("/admin")} style={{ fontSize: 12, color: "#64748B", padding: "7px 14px", borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", fontWeight: 500 }}>Admin</button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setShowUpload(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#1E40AF", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Upload XER
          </button>
          <button onClick={() => { clearToken(); router.replace("/login"); }} title="Sign out" style={{ width: 30, height: 30, borderRadius: "50%", background: "#1E3A8A", border: "2px solid #1E40AF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#93C5FD", cursor: "pointer" }}>
            {(user?.name || user?.email || "U")[0].toUpperCase()}
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 48px 32px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(96,165,250,.1)", border: "1px solid rgba(96,165,250,.2)", borderRadius: 20, padding: "5px 14px", marginBottom: 18 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 11, color: "#93C5FD", fontWeight: 600 }}>{analyses.length} {analyses.length === 1 ? "analysis" : "analyses"} loaded</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#F1F5F9", lineHeight: 1.2, marginBottom: 8 }}>
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {user?.name?.split(" ")[0] || "there"}.
        </h1>
        <p style={{ fontSize: 14, color: "#64748B" }}>Your programme health overview · {company?.name || slug}</p>
      </div>

      {/* ── KPI Strip ── */}
      {kpis && (
        <div style={{ maxWidth: 1200, margin: "0 auto 36px", padding: "0 48px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          {[
            { val: `${kpis.overall_pct_complete}%`, lbl: "Overall Progress", accent: "#3B82F6", trend: `${kpis.total_activities?.toLocaleString()} activities` },
            { val: String(kpis.spi), lbl: "Schedule SPI", accent: kpis.spi >= 1 ? "#34D399" : "#F87171", trend: kpis.spi >= 1 ? "On schedule" : "Behind planned rate" },
            { val: `${kpis.critical_path_risk_pct}%`, lbl: "Critical Risk", accent: "#F59E0B", trend: `${kpis.critical_activities?.toLocaleString()} critical activities` },
            { val: kpis.forecast_end || "—", lbl: "Forecast End", accent: "#A78BFA", trend: kpis.delay_days > 0 ? `${kpis.delay_days}d behind baseline` : "On track" },
          ].map(k => (
            <div key={k.lbl} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: k.accent }} />
              <div style={{ fontSize: 26, fontWeight: 800, color: "#F1F5F9", marginBottom: 4 }}>{k.val}</div>
              <div style={{ fontSize: 10, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.lbl}</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 5 }}>{k.trend}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Featured Card Section ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px 40px" }}>

        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {viewAll ? "All Analyses" : "Latest Analysis"}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

            {/* Filter tabs */}
            {viewAll && (
              <div style={{ display: "flex", gap: 4 }}>
                {(["all", "update", "baseline"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 7, cursor: "pointer", border: "1px solid", background: filter === f ? "rgba(96,165,250,.12)" : "transparent", color: filter === f ? "#93C5FD" : "#475569", borderColor: filter === f ? "rgba(96,165,250,.2)" : "transparent" }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            )}

            {/* Dropdown */}
            {!viewAll && analyses.length > 0 && (
              <div style={{ position: "relative" }}>
                <button onClick={() => setDropOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748B", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
                  {card?.project_name || `Analysis #${card?.id}`}
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {dropOpen && (
                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, width: 280, background: "#1E293B", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, overflow: "hidden", zIndex: 40, boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
                    {analyses.map((a, i) => (
                      <button key={a.id} onClick={() => { goTo(i); setDropOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: i === currentIdx ? "rgba(96,165,250,.1)" : "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,.05)", cursor: "pointer", textAlign: "left" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{a.project_name}</div>
                          <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>{timeAgo(a.created_at)}</div>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: a.file_type === "baseline" ? "rgba(5,150,105,.15)" : "rgba(30,64,175,.2)", color: a.file_type === "baseline" ? "#34D399" : "#60A5FA" }}>{a.file_type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setViewAll(v => !v)} style={{ fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: viewAll ? "rgba(96,165,250,.1)" : "transparent", color: viewAll ? "#93C5FD" : "#64748B", cursor: "pointer" }}>
              {viewAll ? "← Back" : "View All"}
            </button>
          </div>
        </div>

        {/* ── CAROUSEL (single card) — scroll up/down or use arrows ── */}
        {!viewAll && analyses.length > 0 && card && (
          <div
            style={{ display: "flex", alignItems: "center", gap: 16 }}
            onWheel={e => {
              e.preventDefault();
              if (e.deltaY > 0) goTo(currentIdx + 1);
              else goTo(currentIdx - 1);
            }}
          >

            {/* Prev arrow */}
            <button onClick={() => goTo(currentIdx + 1)} disabled={currentIdx >= analyses.length - 1} style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", cursor: currentIdx >= analyses.length - 1 ? "default" : "pointer", opacity: currentIdx >= analyses.length - 1 ? 0.3 : 1, flexShrink: 0 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>

            {/* Featured card */}
            <div style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 20, padding: "28px 32px", cursor: "pointer" }} onClick={() => router.push(`/${slug}/dashboard/${card.id}`)}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: card.file_type === "baseline" ? "rgba(5,150,105,.15)" : "rgba(30,64,175,.2)", color: card.file_type === "baseline" ? "#34D399" : "#60A5FA", border: `1px solid ${card.file_type === "baseline" ? "rgba(52,211,153,.2)" : "rgba(96,165,250,.2)"}` }}>
                      {card.file_type.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10, color: "#475569" }}>{timeAgo(card.created_at)}</span>
                    {currentIdx === 0 && <span style={{ fontSize: 9, fontWeight: 700, color: "#34D399", background: "rgba(52,211,153,.1)", padding: "2px 8px", borderRadius: 20 }}>LATEST</span>}
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: "#F1F5F9", marginBottom: 4 }}>{card.project_name}</h3>
                  <p style={{ fontSize: 12, color: "#475569" }}>{card.filenames.slice(0, 2).join(" · ")}</p>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#60A5FA", display: "flex", alignItems: "center", gap: 4, background: "rgba(96,165,250,.1)", padding: "8px 16px", borderRadius: 10, flexShrink: 0 }}>
                  Open Dashboard
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>

              {/* KPIs inside card */}
              {kpis && currentIdx === analyses.indexOf(card) && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "#64748B" }}>Overall Progress</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#60A5FA" }}>{kpis.overall_pct_complete}%</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,.08)", borderRadius: 99 }}>
                      <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#1E40AF,#3B82F6)", width: `${kpis.overall_pct_complete}%`, transition: "width .6s ease" }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                    {[
                      { lbl: "SPI", val: kpis.spi },
                      { lbl: "Critical Activities", val: kpis.critical_activities?.toLocaleString() },
                      { lbl: "Neg. Float", val: kpis.neg_float_activities },
                      { lbl: "Forecast End", val: kpis.forecast_end || "—" },
                    ].map(s => (
                      <div key={s.lbl}>
                        <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{s.lbl}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#CBD5E1" }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Pagination dots */}
              {analyses.length > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 20 }}>
                  {analyses.map((_, i) => (
                    <button key={i} onClick={e => { e.stopPropagation(); goTo(i); }} style={{ width: i === currentIdx ? 20 : 6, height: 6, borderRadius: 99, background: i === currentIdx ? "#3B82F6" : "rgba(255,255,255,.15)", border: "none", cursor: "pointer", transition: "all .3s", padding: 0 }} />
                  ))}
                </div>
              )}
            </div>

            {/* Next arrow */}
            <button onClick={() => goTo(currentIdx - 1)} disabled={currentIdx <= 0} style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", cursor: currentIdx <= 0 ? "default" : "pointer", opacity: currentIdx <= 0 ? 0.3 : 1, flexShrink: 0 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}

        {/* ── VIEW ALL GRID ── */}
        {viewAll && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 16 }}>
            {filtered.map(a => (
              <div key={a.id} onClick={() => router.push(`/${slug}/dashboard/${a.id}`)} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "20px", cursor: "pointer", transition: "all .2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(96,165,250,.3)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.07)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,.08)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.04)"; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: a.file_type === "baseline" ? "rgba(5,150,105,.15)" : "rgba(30,64,175,.2)", color: a.file_type === "baseline" ? "#34D399" : "#60A5FA" }}>{a.file_type.toUpperCase()}</span>
                  <span style={{ fontSize: 10, color: "#475569" }}>{timeAgo(a.created_at)}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", marginBottom: 4 }}>{a.project_name}</div>
                <div style={{ fontSize: 11, color: "#475569", marginBottom: 14 }}>{a.filenames[0]}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#60A5FA" }}>Open Dashboard →</div>
              </div>
            ))}

            {/* Upload card in grid */}
            <div onClick={() => setShowUpload(true)} style={{ background: "transparent", border: "2px dashed rgba(255,255,255,.1)", borderRadius: 18, padding: "32px 20px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 160, transition: "all .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(96,165,250,.35)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,.1)"; }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,.2)" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginTop: 10 }}>Upload New XER</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {analyses.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📂</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#94A3B8", marginBottom: 8 }}>No analyses yet</h3>
            <p style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>Upload your first XER file to get started</p>
            <button onClick={() => setShowUpload(true)} style={{ background: "#1E40AF", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Upload XER File</button>
          </div>
        )}

        {/* Quick upload CTA when not in view-all */}
        {!viewAll && analyses.length > 0 && (
          <div onClick={() => setShowUpload(true)} style={{ marginTop: 16, border: "2px dashed rgba(255,255,255,.08)", borderRadius: 14, padding: "18px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", transition: "all .2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(96,165,250,.3)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,.08)"; }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,.3)" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            <span style={{ fontSize: 12, color: "#475569" }}>Upload a new XER snapshot</span>
          </div>
        )}
      </div>

      {/* ── Upload Modal ── */}
      {showUpload && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)" }} onClick={e => { if (e.target === e.currentTarget) setShowUpload(false); }}>
          <div style={{ width: "100%", maxWidth: 480, background: "#1E293B", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 40px 80px rgba(0,0,0,.5)" }}>
            <div style={{ height: 3, background: "#1E40AF" }} />
            <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9" }}>Upload XER Files</h3>
                <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Primavera P6 .xer exports</p>
              </div>
              <button onClick={() => { setShowUpload(false); setFiles([]); setUploadError(""); }} style={{ background: "rgba(255,255,255,.06)", border: "none", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748B" }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* Tab toggle */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {(["update", "baseline"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: tab === t ? (t === "baseline" ? "#059669" : "#1E40AF") : "rgba(255,255,255,.06)", color: tab === t ? "#fff" : "#64748B" }}>
                    {t === "update" ? "Update Snapshot" : "Baseline"}
                  </button>
                ))}
              </div>

              {/* Drop zone */}
              <div ref={dropRef} style={{ border: `2px dashed ${dragging ? "#3B82F6" : "rgba(255,255,255,.12)"}`, borderRadius: 12, padding: "32px 16px", textAlign: "center", cursor: "pointer", background: dragging ? "rgba(59,130,246,.05)" : "transparent", position: "relative", marginBottom: 12 }}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}>
                <input type="file" multiple={tab !== "baseline"} accept=".xer" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", zIndex: 5 }} onChange={e => addFiles(e.target.files)} />
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,.25)" strokeWidth={1.5} style={{ margin: "0 auto 8px", display: "block" }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                <p style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>Click or drag XER files</p>
                <p style={{ fontSize: 11, color: "#334155", marginTop: 3 }}>{tab === "baseline" ? "1 file only" : "Up to 10 files"}</p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {files.map(tf => (
                    <div key={tf.file.name} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "8px 12px" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: tf.type === "baseline" ? "#34D399" : "#60A5FA", background: tf.type === "baseline" ? "rgba(52,211,153,.1)" : "rgba(96,165,250,.1)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>XER</span>
                      <span style={{ flex: 1, fontSize: 11, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tf.file.name}</span>
                      <button onClick={() => toggleTag(tf.file.name)} style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: "none", cursor: "pointer", background: tf.type === "baseline" ? "rgba(52,211,153,.15)" : "rgba(96,165,250,.15)", color: tf.type === "baseline" ? "#34D399" : "#60A5FA" }}>{tf.type}</button>
                      <button onClick={() => setFiles(p => p.filter(x => x.file.name !== tf.file.name))} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {uploadError && <p style={{ fontSize: 11, color: "#F87171", marginBottom: 10, background: "rgba(239,68,68,.1)", padding: "8px 12px", borderRadius: 8 }}>{uploadError}</p>}

              <button onClick={() => handleAnalyze(false)} disabled={uploading || !files.length} style={{ width: "100%", padding: "11px", borderRadius: 12, background: uploading || !files.length ? "rgba(255,255,255,.06)" : "#1E40AF", color: uploading || !files.length ? "#334155" : "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: uploading || !files.length ? "not-allowed" : "pointer" }}>
                {uploading ? "Analysing…" : files.length ? `Analyse ${files.length} file${files.length > 1 ? "s" : ""} →` : "Select files above"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Duplicate Modal ── */}
      {duplicates && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)" }}>
          <div style={{ width: "100%", maxWidth: 440, background: "#1E293B", borderRadius: 20, border: "1px solid rgba(255,255,255,.1)", overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,.5)" }}>
            <div style={{ height: 3, background: "#D97706" }} />
            <div style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", marginBottom: 6 }}>Files already analysed</h3>
              <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>These analyses already contain the uploaded files.</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setDuplicates(null)} style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,.06)", color: "#94A3B8", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                <button onClick={() => { setDuplicates(null); handleAnalyze(true); }} style={{ padding: "8px 16px", borderRadius: 10, background: "#DC2626", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Overwrite &amp; Re-analyse</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
