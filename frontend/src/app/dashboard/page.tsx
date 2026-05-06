"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalysisResult } from "@/lib/api";
import { isLoggedIn, clearToken } from "@/lib/auth";
import KPISummary from "@/components/KPISummary";
import SCurve from "@/components/SCurve";
import SPIByContractor from "@/components/SPIByContractor";
import PPCTable from "@/components/PPCTable";
import ResourceHistogram from "@/components/ResourceHistogram";
import FloatErosion from "@/components/FloatErosion";
import MilestoneTracker from "@/components/MilestoneTracker";
import CriticalPath from "@/components/CriticalPath";
import ObservationsPanel from "@/components/ObservationsPanel";

const NAV = [
  { id: "kpi",          label: "KPI Summary",          icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id: "observations", label: "Observations",          icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "scurve",       label: "S-Curve",               icon: "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" },
  { id: "performance",  label: "Schedule Performance",  icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { id: "resources",    label: "Resources & Float",     icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" },
  { id: "milestones",   label: "Milestones",            icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { id: "critical",     label: "Critical Path",         icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
];

export default function DashboardPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [active, setActive] = useState("kpi");
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    const raw = sessionStorage.getItem("analysisResult");
    if (!raw) { router.replace("/"); return; }
    setResult(JSON.parse(raw));
  }, [router]);

  // Highlight nav on scroll
  useEffect(() => {
    const handler = () => {
      for (const item of [...NAV].reverse()) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActive(item.id);
          return;
        }
      }
      setActive("kpi");
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function downloadPDF() {
    if (!result) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    const name = result.kpis.project_name || "Programme Analytics";
    const original = document.title;
    document.title = `${name} - ${dateStr}`;
    window.print();
    document.title = original;
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F1F5F9" }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-slate-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading analysis…</p>
        </div>
      </div>
    );
  }

  const { kpis, spi_by_contractor, ppc, scurve, resources, float_erosion, milestones, critical_path, observations, files_analyzed, data_dates } = result;
  const spiColor = kpis.spi >= 0.95 ? "#10B981" : kpis.spi >= 0.85 ? "#F59E0B" : "#EF4444";

  return (
    <div className="min-h-screen flex" style={{ background: "#EAECF0" }}>

      {/* ── Left Sidebar ───────────────────────────────────────────── */}
      <aside className="no-print hidden lg:flex flex-col fixed top-0 left-0 h-screen w-56 xl:w-60 bg-slate-900 z-30 shrink-0">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center border border-white/20 shrink-0">
              <span className="text-white font-bold text-[10px] tracking-wide">P6</span>
            </div>
            <div>
              <p className="text-white text-xs font-bold leading-tight">Programme Analytics</p>
              <p className="text-white/40 text-[10px]">Elise Enterprise</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-2 pb-2">Report Sections</p>
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all text-xs font-medium ${
                active === item.id
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10 space-y-2">
          <button
            onClick={downloadPDF}
            className="w-full flex items-center gap-2 text-xs text-white bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-2 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
          <button
            onClick={() => { clearToken(); router.replace("/login"); }}
            className="w-full flex items-center gap-2 text-xs text-white/40 hover:text-white/70 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area (offset for sidebar) ─────────────────────────── */}
      <div className="flex-1 lg:ml-56 xl:ml-60 min-h-screen">

        {/* ── Top bar ─────────────────────────────────────────────── */}
        <header className="no-print sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="px-6 xl:px-10 h-14 flex items-center gap-4">
            {/* Project name */}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{kpis.project_name || "Programme Health Report"}</p>
              <p className="text-[10px] text-slate-400">Data Date: <span className="font-semibold text-slate-600">{kpis.data_date}</span></p>
            </div>

            <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* KPI pills */}
            <div className="hidden sm:flex items-center gap-2 flex-1 overflow-hidden">
              <Pill label="Progress" value={`${kpis.overall_pct_complete}%`} />
              <Pill label="SPI" value={kpis.spi.toFixed(2)} color={spiColor} />
              <Pill label="Critical" value={kpis.critical_activities.toLocaleString()} color="#EF4444" />
              <Pill label="FA Date" value={kpis.forecast_end || "—"} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <button onClick={downloadPDF} className="no-print hidden md:flex items-center gap-1.5 text-xs text-white bg-slate-900 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
              <button onClick={() => window.print()} className="no-print hidden md:flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              <button onClick={() => router.push("/")} className="no-print flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                New Analysis
              </button>
            </div>
          </div>
        </header>

        {/* ── Report document ──────────────────────────────────────── */}
        <div className="px-4 md:px-8 xl:px-12 py-8">

          {/* Report header card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
            <div className="px-6 md:px-8 py-6 flex items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Programme Health Report</span>
                  <span className="text-[10px] text-slate-300">·</span>
                  <span className="text-[10px] text-slate-400">{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">{kpis.project_name || "VIE013"}</h1>
                <p className="text-sm text-slate-400">
                  Analysis across <span className="font-semibold text-slate-600">{files_analyzed.length} snapshot{files_analyzed.length > 1 ? "s" : ""}</span>
                  {data_dates.length > 0 && <> · <span className="font-mono">{data_dates.join(" → ")}</span></>}
                </p>
              </div>
              {/* Status badge */}
              <div className={`shrink-0 px-4 py-2 rounded-xl text-center ${kpis.spi >= 0.95 ? "bg-emerald-50 border border-emerald-200" : kpis.spi >= 0.85 ? "bg-amber-50 border border-amber-200" : "bg-red-50 border border-red-200"}`}>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">SPI Status</p>
                <p className={`text-2xl font-bold ${kpis.spi >= 0.95 ? "text-emerald-600" : kpis.spi >= 0.85 ? "text-amber-600" : "text-red-600"}`}>{kpis.spi.toFixed(2)}</p>
                <p className={`text-[10px] font-medium ${kpis.spi >= 0.95 ? "text-emerald-500" : kpis.spi >= 0.85 ? "text-amber-500" : "text-red-500"}`}>
                  {kpis.spi >= 0.95 ? "On Track" : kpis.spi >= 0.85 ? "At Risk" : "Behind Plan"}
                </p>
              </div>
            </div>
            {/* File tags */}
            <div className="px-6 md:px-8 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
              {files_analyzed.map((f, i) => (
                <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-500 font-mono px-2.5 py-1 rounded-lg">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-6">

            <Section id="kpi" label="Key Performance Indicators">
              <KPISummary kpis={kpis} />
            </Section>

            <Section id="observations" label="Observations & Risk">
              <ObservationsPanel observations={observations} />
            </Section>

            <Section id="scurve" label="Progress S-Curve">
              <SCurve data={scurve} />
            </Section>

            <Section id="performance" label="Schedule Performance">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SPIByContractor data={spi_by_contractor} />
                <PPCTable data={ppc} />
              </div>
            </Section>

            <Section id="resources" label="Resources & Float">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ResourceHistogram data={resources} />
                <FloatErosion data={float_erosion} />
              </div>
            </Section>

            <Section id="milestones" label="Milestone Tracker">
              <MilestoneTracker data={milestones} />
            </Section>

            <Section id="critical" label="Critical Path Activities">
              <CriticalPath data={critical_path} />
            </Section>

          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-900 rounded flex items-center justify-center">
                <span className="text-white font-bold text-[8px]">P6</span>
              </div>
              <span className="text-xs text-slate-400">Elise Enterprise · Programme Analytics</span>
            </div>
            <p className="text-xs text-slate-400">Generated {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-0.5 h-4 bg-slate-800 rounded-full" />
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em]">{label}</h2>
      </div>
      {children}
    </section>
  );
}

function Pill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
      <span className="text-[10px] text-slate-400 font-medium">{label}</span>
      <span className="text-xs font-bold" style={{ color: color || "#334155" }}>{value}</span>
    </div>
  );
}
