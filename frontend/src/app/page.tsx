"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";

const FEATURES = [
  { icon: "📊", title: "S-Curve Analysis", desc: "Baseline vs Actual vs Forecast with dynamic 12-month windowing." },
  { icon: "🎯", title: "Critical Path Risk", desc: "Identify zero-float activities and negative float before they escalate." },
  { icon: "🏗️", title: "SPI by Contractor", desc: "Schedule Performance Index broken down by labour resource." },
  { icon: "📅", title: "Milestone Tracker", desc: "Key milestones with baseline, actual, forecast and variance in days." },
  { icon: "💬", title: "AI Chat Assistant", desc: "Ask GPT-4o anything about your programme — context-aware answers." },
  { icon: "📁", title: "File History", desc: "Every analysis saved. Reload any snapshot instantly." },
  { icon: "🔁", title: "Float Erosion", desc: "Compare consecutive snapshots to catch eroding schedule buffers." },
  { icon: "📈", title: "WBS Gantt Chart", desc: "Collapsible work breakdown with planned vs actual bars." },
];

const STATS = [
  { value: "8+", label: "Analytics Sections" },
  { value: "P6", label: "Primavera Native" },
  { value: "GPT-4o", label: "AI Powered" },
  { value: "PWA", label: "Install on Any Device" },
];

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  return (
    <main className="min-h-screen bg-[#0F172A] text-white">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-bold">P</div>
          <span className="font-bold text-lg tracking-tight">Plainview</span>
          <span className="text-white/30 text-xs">by Elise Enterprise</span>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="bg-white text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          Sign In →
        </button>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 text-xs text-blue-400 font-semibold mb-8">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
          Phase 2 — Multi-User · AI Chat · Full History
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
          Primavera P6 Analytics<br />
          <span className="text-blue-400">built for serious PMs</span>
        </h1>

        <p className="text-white/50 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your XER files and get a complete programme health report in seconds — S-Curves,
          Critical Path, Float Erosion, Milestones, SPI by Contractor, and an AI assistant that
          knows your data.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 text-sm"
          >
            Get Started →
          </button>
          <button
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            className="border border-white/20 hover:border-white/40 text-white/70 hover:text-white font-semibold px-8 py-3.5 rounded-xl transition-all text-sm"
          >
            See Features
          </button>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <section className="border-y border-white/10 py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-blue-400">{s.value}</p>
              <p className="text-white/40 text-xs mt-1 font-medium uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Capabilities</p>
          <h2 className="text-4xl font-extrabold">Everything your PMO needs</h2>
          <p className="text-white/40 mt-3 text-base max-w-lg mx-auto">
            Built specifically for Primavera P6 XER files. No configuration required.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white/5 hover:bg-white/8 border border-white/10 rounded-2xl p-5 transition-colors group">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-sm mb-1.5 text-white">{f.title}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20 text-center px-6">
        <h2 className="text-3xl font-extrabold mb-4">Ready to start?</h2>
        <p className="text-white/40 mb-8 text-sm">Sign in with your credentials to upload XER files and view the dashboard.</p>
        <button
          onClick={() => router.push("/login")}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-10 py-4 rounded-xl transition-all shadow-lg shadow-blue-600/25 text-sm"
        >
          Sign In to Plainview →
        </button>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-8 text-center text-white/20 text-xs">
        Plainview · Elise Enterprise · Built by Redline Intelligence
      </footer>
    </main>
  );
}
