"use client";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { downloadPDF } from "@/lib/downloadPDF";
import { useParams, useRouter } from "next/navigation";
import { AnalysisResult, fetchAnalysis, fetchCompany, CompanyInfo } from "@/lib/api";
import { isLoggedIn, clearToken, getUser, getUploadPath } from "@/lib/auth";
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

function AnalysisDashboardInner() {
  const params = useParams();
  const slug = params.slug as string;
  const analysisId = Number(params.analysisId);
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [active, setActive] = useState("executive");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const user = getUser();

  const loadAnalysis = useCallback(async (id: number) => {
    try {
      const data = await fetchAnalysis(id);
      setResult(data);
      setSidebarOpen(false);
      router.push(`/${slug}/dashboard/${id}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { /* silent */ }
  }, [slug, router]);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    fetchCompany(slug).then(setCompany).catch(() => {});
    fetchAnalysis(analysisId).then(setResult).catch(() => router.replace(getUploadPath()));
  }, [slug, analysisId, router]);

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

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-app)" }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-t-blue-600 animate-spin mx-auto mb-3"
            style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)" }} />
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading analysis…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)" }}>

      {/* History Sidebar */}
      <div className={`${sidebarOpen ? "w-64" : "w-0"} shrink-0 transition-all duration-300 overflow-hidden no-print`}>
        <div className="w-64 h-full">
          <FileHistorySidebar
            currentAnalysisId={analysisId}
            onSelect={loadAnalysis}
            onNewAnalysis={() => router.push(`/${slug}`)}
          />
        </div>
      </div>

      {/* Nav Sidebar */}
      <div className="hidden lg:flex flex-col w-56 shrink-0 h-full no-print"
        style={{ background: "var(--bg-nav)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

        {/* Logo + project */}
        <div className="px-4 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2.5 mb-4">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-7 w-auto object-contain" />
            ) : (
              <img src="/plainview-logo.png" alt="PlainView" className="h-7 w-auto object-contain max-w-[100px]"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <div className="min-w-0">
              <p className="font-bold truncate" style={{ fontSize: 12, color: "#E2E8F0", lineHeight: 1.3 }}>{company?.name || slug}</p>
              <p className="truncate" style={{ fontSize: 10, color: "#475569" }}>{result.kpis?.project_name}</p>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
            style={{
              fontSize: 10, fontWeight: 600,
              background: sidebarOpen ? "rgba(96,165,250,0.12)" : "transparent",
              color: sidebarOpen ? "#93C5FD" : "#64748B",
            }}
            onMouseEnter={(e) => { if (!sidebarOpen) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; } }}
            onMouseLeave={(e) => { if (!sidebarOpen) { e.currentTarget.style.background = "transparent"; } }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {sidebarOpen ? "Hide History" : "History"}
          </button>

          <a href={`/${slug}`}
            className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors mt-1"
            style={{ fontSize: 10, fontWeight: 600, color: "#64748B", background: "transparent", textDecoration: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLAnchorElement).style.color = "#93C5FD"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = "#64748B"; }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Analysis
          </a>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition-all"
              style={{
                fontSize: 12,
                background: active === item.id ? "rgba(96,165,250,0.15)" : "transparent",
                color: active === item.id ? "#93C5FD" : "#64748B",
                borderLeft: active === item.id ? "2px solid #60A5FA" : "2px solid transparent",
              }}>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        {/* PDF export */}
        <div className="px-3 py-2.5 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            disabled={pdfLoading || !contentRef.current}
            onClick={async () => {
              if (!contentRef.current) return;
              setPdfLoading(true);
              try {
                const name = result?.kpis?.project_name ?? "plainview";
                await downloadPDF(contentRef.current, `${name}-report.pdf`);
              } finally {
                setPdfLoading(false);
              }
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 font-semibold transition-all"
            style={{ fontSize: 11, background: pdfLoading ? "rgba(30,64,175,0.09)" : "rgba(30,64,175,0.18)", color: "#93C5FD", border: "1px solid rgba(96,165,250,0.2)", cursor: pdfLoading ? "wait" : "pointer" }}
            onMouseEnter={(e) => { if (!pdfLoading) (e.currentTarget as HTMLButtonElement).style.background = "rgba(30,64,175,0.28)"; }}
            onMouseLeave={(e) => { if (!pdfLoading) (e.currentTarget as HTMLButtonElement).style.background = "rgba(30,64,175,0.18)"; }}>
            {pdfLoading ? (
              <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Generating…</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Download PDF</>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 shrink-0 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="truncate" style={{ fontSize: 10, color: "#475569" }}>{user?.name || user?.email}</p>
          <div className="flex gap-2 items-center">
            {user?.role === "admin" && (
              <a href="/admin" style={{ color: "#475569" }} title="Admin Panel"
                onMouseEnter={(e) => (e.currentTarget.style.color = "#F59E0B")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </a>
            )}
            <button onClick={() => { clearToken(); router.replace("/login"); }} style={{ color: "#475569" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#94A3B8")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg-app)" }}>
        <div ref={contentRef} className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <section id="executive"><ExecutiveSummary kpis={result.kpis} observations={result.observations} spi_by_contractor={result.spi_by_contractor} milestones={result.milestones} float_erosion={result.float_erosion} /></section>
          <section id="kpi"><KPISummary kpis={result.kpis} /></section>
          <section id="observations"><ObservationsPanel observations={result.observations} /></section>
          <section id="scurve"><SCurve data={result.scurve} /></section>
          {result.gantt && result.gantt.tasks.length > 0 && (
            <section id="gantt"><GanttChart data={result.gantt} /></section>
          )}
          <section id="performance">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <SPIByContractor data={result.spi_by_contractor} />
              <div className="flex flex-col gap-6">
                <PPCTable data={result.ppc} />
                <div id="resources" className="flex flex-col gap-6">
                  <ResourceHistogram data={result.resources} />
                  <FloatErosion data={result.float_erosion} />
                </div>
              </div>
            </div>
          </section>
          <section id="milestones"><MilestoneTracker data={result.milestones} /></section>
          <section id="critical"><CriticalPath data={result.critical_path} /></section>
          <div className="pb-24" />
        </div>
      </main>

      <AIChatPanel analysisId={analysisId} />
    </div>
  );
}

export default function AnalysisDashboardPage() {
  return (
    <Suspense>
      <AnalysisDashboardInner />
    </Suspense>
  );
}
