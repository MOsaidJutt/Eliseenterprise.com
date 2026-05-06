"use client";

import { useState, DragEvent, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { analyzeXerFiles, fetchAdminStats, AdminStats } from "@/lib/api";
import { isLoggedIn, clearToken } from "@/lib/auth";

const FEATURES = [
  { icon: "📈", label: "S-Curve Analysis" },
  { icon: "🏗️", label: "SPI by Contractor" },
  { icon: "✅", label: "PPC Tracking" },
  { icon: "⚠️", label: "Float Erosion" },
  { icon: "🎯", label: "Milestone Tracker" },
  { icon: "🔴", label: "Critical Path" },
];

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Triple-click counter on the P6 logo
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) router.replace("/login");
  }, [router]);

  const handleLogoClick = useCallback(() => {
    clickCountRef.current += 1;
    if (clickCountRef.current === 1) {
      // Start the window on the first click
      clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0; }, 1500);
    }
    if (clickCountRef.current >= 3) {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickCountRef.current = 0;
      openAdmin();
    }
  }, []);

  async function openAdmin() {
    setAdminOpen(true);
    setAdminLoading(true);
    try {
      const stats = await fetchAdminStats();
      setAdminStats(stats);
    } catch {
      setAdminStats(null);
    } finally {
      setAdminLoading(false);
    }
  }

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  function addFiles(newFiles: FileList | null) {
    if (!newFiles || newFiles.length === 0) return;
    const all = Array.from(newFiles);
    const xers = all.filter((f) => f.name.toLowerCase().endsWith(".xer"));
    if (xers.length === 0) {
      setError(`"${all[0].name}" is not an XER file. Please select .xer files.`);
      return;
    }
    setFiles((prev) => {
      const combined = [...prev, ...xers];
      const unique = combined.filter((f, i, arr) => arr.findIndex((x) => x.name === f.name) === i);
      return unique.slice(0, 4);
    });
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  async function handleAnalyze() {
    if (files.length === 0) { setError("Please select at least one XER file first."); return; }
    setLoading(true);
    setError("");
    try {
      const result = await analyzeXerFiles(files);
      sessionStorage.setItem("analysisResult", JSON.stringify(result));
      router.push("/dashboard");
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("401")) {
        clearToken();
        router.replace("/login");
        return;
      }
      setError(e instanceof Error ? e.message : "Analysis failed. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #F8FAFC 0%, #EFF3F8 100%)" }}>

      {/* ── Admin Panel Modal ────────────────────────────────────── */}
      {adminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-white text-sm font-semibold">Admin Panel</span>
                {adminStats && (
                  <span className="text-white/40 text-xs">· {adminStats.files_processed} analyses total</span>
                )}
              </div>
              <button onClick={() => setAdminOpen(false)} className="text-white/60 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats row */}
            {adminStats && (
              <div className="grid grid-cols-2 gap-3 px-6 py-4 border-b border-slate-100 shrink-0">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Total Analyses</p>
                  <p className="text-3xl font-bold text-slate-900">{adminStats.files_processed}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center">
                  <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider mb-1">Active Sessions</p>
                  <p className="text-3xl font-bold text-emerald-700">{adminStats.active_sessions}</p>
                </div>
              </div>
            )}

            {/* Log table */}
            <div className="flex-1 overflow-y-auto">
              {adminLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !adminStats ? (
                <p className="text-sm text-slate-400 text-center py-10">Could not load stats.</p>
              ) : adminStats.log.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No analyses run yet.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-8">#</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">When</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Project</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminStats.log.map((entry, i) => (
                      <tr key={entry.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="px-5 py-3 text-slate-300 font-mono">{entry.id}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono whitespace-nowrap">{entry.timestamp}</td>
                        <td className="px-4 py-3 text-slate-700 font-medium max-w-[160px] truncate">{entry.project}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {entry.files.map((f, fi) => (
                              <span key={fi} className="inline-block bg-slate-100 text-slate-600 font-mono text-[10px] px-2 py-0.5 rounded truncate max-w-[200px]">{f}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 shrink-0">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 py-2 rounded-xl transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Left sidebar ────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-80 xl:w-96 bg-slate-900 p-10 text-white shrink-0">
        <div>
          {/* Logo — triple-click to open admin */}
          <div
            className="flex items-center gap-3 mb-12 cursor-default select-none"
            onClick={handleLogoClick}
          >
            <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
              <span className="text-white font-bold text-xs tracking-wide">P6</span>
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">Programme Analytics</p>
              <p className="text-white/40 text-xs">Elise Enterprise</p>
            </div>
          </div>

          <div className="mb-10">
            <h1 className="text-2xl font-bold leading-tight mb-3">
              Turn XER files into<br />actionable insights
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Upload your Primavera P6 XER exports and receive a full programme health analysis in seconds.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm shrink-0">
                  {f.icon}
                </div>
                <span className="text-white/70 text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex items-center justify-between">
          <p className="text-white/30 text-xs">Powered by Python + FastAPI + Next.js</p>
          <button onClick={handleLogout} title="Sign out" className="text-white/30 hover:text-white/60 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between w-full max-w-lg mb-8">
          <div className="flex items-center gap-3" onClick={handleLogoClick}>
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center cursor-default">
              <span className="text-white font-bold text-xs">P6</span>
            </div>
            <p className="font-bold text-slate-900">Programme Analytics</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        <div className="w-full max-w-lg">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Upload Schedule Files</h2>
            <p className="text-slate-500 text-sm">
              Upload 1–4 Primavera P6 .xer files. Multiple weekly snapshots unlock PPC and float erosion tracking.
            </p>
          </div>

          {/* Upload card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

            {/* Drop zone */}
            <div
              className={`relative p-8 border-b border-slate-100 transition-all duration-200 ${dragging ? "bg-slate-100" : "hover:bg-slate-50/50"}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 10 }}
                onChange={(e) => addFiles(e.target.files)}
              />
              <div className="flex flex-col items-center gap-4 py-4 pointer-events-none">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragging ? "bg-slate-200" : "bg-slate-100"}`}>
                  <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-700 text-sm">
                    {dragging ? "Release to upload" : "Click here to browse XER files"}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">or drag & drop · up to 4 files</p>
                </div>
              </div>
            </div>

            {/* File list */}
            <div className="p-4 space-y-1 min-h-16">
              {files.length === 0 ? (
                <div className="flex items-center gap-2 py-2 px-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <p className="text-xs text-slate-400">No files selected — weekly snapshots recommended</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-1 pb-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Queued ({files.length}/4)</p>
                    <button type="button" onClick={() => setFiles([])} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Clear all</button>
                  </div>
                  {files.map((f, idx) => (
                    <div key={f.name} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 group">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                        <span className="text-white text-[9px] font-bold tracking-wide">XER</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{f.name}</p>
                        <p className="text-[10px] text-slate-400">{(f.size / 1024).toFixed(0)} KB · File {idx + 1}</p>
                      </div>
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <button type="button" onClick={() => removeFile(f.name)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 ml-1 p-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mx-4 mb-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Analyze button */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading || files.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 text-sm shadow-sm"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Analysing {files.length} file{files.length > 1 ? "s" : ""}…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {files.length === 0 ? "Select files above to continue" : `Run Schedule Analysis (${files.length} file${files.length > 1 ? "s" : ""})`}
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Data is processed locally · nothing is stored or sent to the cloud
          </p>
        </div>
      </div>
    </main>
  );
}
