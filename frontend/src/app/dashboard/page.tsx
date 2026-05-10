"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnalysisResult, fetchAnalysis } from "@/lib/api";
import { isLoggedIn, clearToken, getUser } from "@/lib/auth";
import KPISummary from "@/components/KPISummary";
import SCurve from "@/components/SCurve";
import SPIByContractor from "@/components/SPIByContractor";
import PPCTable from "@/components/PPCTable";
import ResourceHistogram from "@/components/ResourceHistogram";
import FloatErosion from "@/components/FloatErosion";
import MilestoneTracker from "@/components/MilestoneTracker";
import CriticalPath from "@/components/CriticalPath";
import ObservationsPanel from "@/components/ObservationsPanel";
import ExecutiveSummary from "@/components/ExecutiveSummary";
import FileHistorySidebar from "@/components/FileHistorySidebar";
import GanttChart from "@/components/GanttChart";
import AIChatPanel from "@/components/AIChatPanel";

const NAV = [
  { id: "executive",    label: "Executive Summary",    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "kpi",          label: "KPI Summary",          icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id: "observations", label: "Observations",         icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "scurve",       label: "S-Curve",              icon: "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" },
  { id: "gantt",        label: "Gantt Chart",          icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
  { id: "performance",  label: "Schedule Performance", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { id: "resources",    label: "Resources & Float",    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" },
  { id: "milestones",   label: "Milestones",           icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { id: "critical",     label: "Critical Path",        icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
];

export default function DashboardPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [active, setActive] = useState("kpi");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = getUser();

  const loadAnalysis = useCallback(async (id: number) => {
    setLoadingHistory(true);
    try {
      const data = await fetchAnalysis(id);
      setResult(data);
      sessionStorage.setItem("analysisResult", JSON.stringify(data));
      sessionStorage.setItem("analysisId", String(id));
      setSidebarOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    // Check for analysis_id in query string (deep link)
    const aid = searchParams.get("analysis_id");
    if (aid) { loadAnalysis(Number(aid)); return; }
    // Fall back to sessionStorage
    const raw = sessionStorage.getItem("analysisResult");
    if (!raw) { router.replace("/"); return; }
    setResult(JSON.parse(raw));
  }, [router, searchParams, loadAnalysis]);

  // Nav highlight on scroll
  useEffect(() => {
    const handler = () => {
      for (const item of [...NAV].reverse()) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= 120) { setActive(item.id); return; }
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleLogout() { clearToken(); router.replace("/login"); }

  const currentAnalysisId = result?.analysis_id
    ?? (Number(sessionStorage.getItem("analysisId") || "0") || undefined);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070C18]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500/40 border-t-blue-400 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">{loadingHistory ? "Loading analysis…" : "Loading dashboard…"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#070C18] overflow-hidden">

      {/* ── History Sidebar (toggleable) ──────────────────────────────────── */}
      <div className={`${sidebarOpen ? "w-64" : "w-0"} shrink-0 transition-all duration-300 overflow-hidden no-print`}>
        <div className="w-64 h-full">
          <FileHistorySidebar
            currentAnalysisId={currentAnalysisId}
            onSelect={loadAnalysis}
            onNewAnalysis={() => router.push("/")}
          />
        </div>
      </div>

      {/* ── Left Nav Sidebar ──────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-56 shrink-0 bg-slate-900 h-full no-print">
        {/* Logo + project */}
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0">P</div>
            <div className="min-w-0">
              <p className="text-white text-xs font-bold leading-tight truncate">Plainview</p>
              <p className="text-white/30 text-[10px] truncate">{result.kpis?.project_name || "Analytics"}</p>
            </div>
          </div>
          {/* History toggle */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className={`w-full flex items-center gap-2 text-[10px] font-semibold px-2 py-1.5 rounded-lg transition-colors ${sidebarOpen ? "bg-blue-600/20 text-blue-400" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {sidebarOpen ? "Hide History" : "History"}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium transition-all ${
                active === item.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-white/50 text-[10px] truncate">{user?.name || user?.email || "User"}</p>
              <p className="text-white/20 text-[9px]">{user?.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="text-white/30 hover:text-white/60 transition-colors"
                title="Print / Export PDF"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
              <button onClick={handleLogout} className="text-white/30 hover:text-white/60 transition-colors" title="Sign out">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-[#070C18]">
        {/* Print header (hidden on screen) */}
        <div className="hidden print:block border-b border-slate-200 py-4 px-8 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Programme Analytics Report</h1>
              <p className="text-sm text-slate-500">{result.kpis?.project_name} · Data Date: {result.kpis?.data_date}</p>
            </div>
            <p className="text-xs text-slate-400">Generated {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white no-print sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen((o) => !o)} className="text-white/60 hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <span className="text-sm font-bold">Plainview</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="text-white/50 hover:text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
            <button onClick={handleLogout} className="text-white/50 hover:text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Report content */}
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

          {/* Report header */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 no-print">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Programme Analytics</p>
              <h2 className="text-2xl font-extrabold text-slate-100">{result.kpis?.project_name || "Schedule Report"}</h2>
              <p className="text-slate-500 text-sm mt-1">
                Data Date: <span className="font-semibold text-slate-300">{result.kpis?.data_date}</span>
                {result.files_analyzed?.length > 0 && (
                  <> · {result.files_analyzed.length} file{result.files_analyzed.length > 1 ? "s" : ""}</>
                )}
              </p>
            </div>
            {result.analysis_id && (
              <div className="text-[10px] text-slate-500 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-lg font-mono">
                Analysis #{result.analysis_id}
              </div>
            )}
          </div>

          <section id="executive"><ExecutiveSummary kpis={result.kpis} observations={result.observations} spi_by_contractor={result.spi_by_contractor} milestones={result.milestones} float_erosion={result.float_erosion} /></section>
          <section id="kpi" className="print-break"><KPISummary kpis={result.kpis} /></section>
          <section id="observations"><ObservationsPanel observations={result.observations} /></section>
          <section id="scurve" className="print-break"><SCurve data={result.scurve} /></section>

          {result.gantt && result.gantt.tasks.length > 0 && (
            <section id="gantt" className="print-break">
              <GanttChart data={result.gantt} />
            </section>
          )}

          <section id="performance" className="print-break">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <SPIByContractor data={result.spi_by_contractor} />
              {result.ppc.length > 0 && <PPCTable data={result.ppc} />}
            </div>
          </section>

          <section id="resources" className="print-break">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ResourceHistogram data={result.resources} />
              {result.float_erosion.length > 0 && <FloatErosion data={result.float_erosion} />}
            </div>
          </section>

          <section id="milestones" className="print-break"><MilestoneTracker data={result.milestones} /></section>
          <section id="critical" className="print-break"><CriticalPath data={result.critical_path} /></section>

          <div className="pb-20" />
        </div>
      </main>

      {/* AI Chat Panel */}
      <AIChatPanel analysisId={currentAnalysisId} />
    </div>
  );
}
