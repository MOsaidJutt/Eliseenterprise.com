"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchCompany,
  analyzeXerFiles,
  CompanyInfo,
  DuplicateAnalysis,
  DuplicateResponse,
  AnalysisResult,
} from "@/lib/api";
import { isLoggedIn, clearToken, getUser } from "@/lib/auth";

// ── Duplicate Modal ───────────────────────────────────────────────────────────
function DuplicateModal({
  slug,
  duplicates,
  onCancel,
  onOverwrite,
  overwriting,
}: {
  slug: string;
  duplicates: DuplicateAnalysis[];
  onCancel: () => void;
  onOverwrite: () => void;
  overwriting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0D1829] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60 w-full max-w-lg">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-slate-100 font-semibold text-sm">Files already analysed</h2>
          </div>
          <p className="text-slate-500 text-xs ml-11">
            The following analyses already contain these files:
          </p>
        </div>

        {/* Duplicate list */}
        <div className="px-6 py-4 space-y-2.5 max-h-64 overflow-y-auto">
          {duplicates.map((d) => (
            <div
              key={d.id}
              className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-xs font-semibold truncate">{d.project_name || "Untitled"}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  {new Date(d.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  {" · "}
                  <span className={`font-medium ${d.file_type === "baseline" ? "text-emerald-400" : "text-blue-400"}`}>
                    {d.file_type}
                  </span>
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {d.filenames.map((fn) => (
                    <span key={fn} className="text-[10px] text-slate-600 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded font-mono truncate max-w-[14rem]">
                      {fn}
                    </span>
                  ))}
                </div>
              </div>
              <a
                href={`/${slug}/dashboard?analysis_id=${d.id}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-[10px] text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 px-2.5 py-1 rounded-lg transition-all whitespace-nowrap"
              >
                View Previous
              </a>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-3 border-t border-white/[0.07] flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={overwriting}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 border border-white/[0.08] rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onOverwrite}
            disabled={overwriting}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:bg-red-900/40 disabled:cursor-not-allowed text-white rounded-xl transition-all"
          >
            {overwriting && (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            Overwrite — Delete Old &amp; Re-analyse
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CompanyUploadPage() {
  const params = useParams();
  const slug   = params.slug as string;
  const router = useRouter();
  const [company,     setCompany]     = useState<CompanyInfo | null>(null);
  const [files,       setFiles]       = useState<File[]>([]);
  const [fileType,    setFileType]    = useState<"baseline" | "update">("update");
  const [dragging,    setDragging]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [overwriting, setOverwriting] = useState(false);
  const [error,       setError]       = useState("");
  const [user,        setUser]        = useState<ReturnType<typeof getUser>>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateAnalysis[] | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    setUser(getUser());
    fetchCompany(slug).then(setCompany).catch(() => {});
  }, [slug, router]);

  function addFiles(fl: FileList | null) {
    if (!fl) return;
    const xers = Array.from(fl).filter((f) => f.name.toLowerCase().endsWith(".xer"));
    if (xers.length === 0) { setError("Please select .xer files."); return; }

    if (fileType === "baseline") {
      // Baseline: only 1 file allowed — take the first
      const first = xers[0];
      setFiles([first]);
      if (xers.length > 1) {
        setError("Baseline accepts 1 file only — first file selected.");
      } else {
        setError("");
      }
      return;
    }

    setFiles((prev) => {
      const combined = [...prev, ...xers];
      const unique   = combined.filter((f, i, arr) => arr.findIndex((x) => x.name === f.name) === i);
      return unique.slice(0, 10);
    });
    setError("");
  }

  // When file type changes to baseline, trim to 1 file
  function handleFileTypeChange(type: "baseline" | "update") {
    setFileType(type);
    if (type === "baseline" && files.length > 1) {
      setFiles([files[0]]);
      setError("Baseline accepts 1 file only — first file selected.");
    } else {
      setError("");
    }
  }

  async function handleAnalyze() {
    if (files.length === 0) { setError("Select at least one XER file."); return; }
    setLoading(true);
    setError("");
    try {
      const result = await analyzeXerFiles(files, fileType, "", false);

      // Check for duplicate response
      if ("duplicate" in result && result.duplicate === true) {
        const dup = result as DuplicateResponse;
        setDuplicateInfo(dup.duplicate_analyses);
        setLoading(false);
        return;
      }

      const analysis = result as AnalysisResult;
      sessionStorage.setItem("analysisResult", JSON.stringify(analysis));
      if (analysis.analysis_id) {
        sessionStorage.setItem("analysisId", String(analysis.analysis_id));
        router.push(`/${slug}/dashboard/${analysis.analysis_id}`);
      } else {
        router.push(`/${slug}/dashboard`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleOverwrite() {
    setOverwriting(true);
    setError("");
    try {
      const result = await analyzeXerFiles(files, fileType, "", true);

      // Force=true should not return a duplicate, but guard anyway
      if ("duplicate" in result && result.duplicate === true) {
        setError("Unexpected duplicate response on overwrite.");
        setOverwriting(false);
        return;
      }

      const analysis = result as AnalysisResult;
      setDuplicateInfo(null);
      sessionStorage.setItem("analysisResult", JSON.stringify(analysis));
      if (analysis.analysis_id) {
        sessionStorage.setItem("analysisId", String(analysis.analysis_id));
        router.push(`/${slug}/dashboard/${analysis.analysis_id}`);
      } else {
        router.push(`/${slug}/dashboard`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Overwrite failed");
      setOverwriting(false);
    }
  }

  const logoUrl = company?.logo_url;
  const maxFilesLabel = fileType === "baseline" ? "1 .xer file" : "Up to 10 .xer files";

  return (
    <main className="min-h-screen flex bg-[#070C18]">

      {/* Duplicate Modal */}
      {duplicateInfo && (
        <DuplicateModal
          slug={slug}
          duplicates={duplicateInfo}
          onCancel={() => setDuplicateInfo(null)}
          onOverwrite={handleOverwrite}
          overwriting={overwriting}
        />
      )}

      {/* Left branding */}
      <div className="hidden lg:flex flex-col justify-between w-80 xl:w-96 bg-[#0A1220] border-r border-white/[0.07] p-10 text-white shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-12">
            {logoUrl ? (
              <img src={logoUrl} alt={company?.name} className="h-9 w-auto object-contain" />
            ) : (
              <img src="/plainview-logo.png" alt="PlainView" className="h-9 w-auto object-contain max-w-[140px]"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <div>
              <p className="font-bold text-sm text-slate-200">{company?.name || slug}</p>
              <p className="text-slate-600 text-xs">Programme Analytics</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full mb-4">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-[11px] text-blue-400 font-semibold">Upload XER Files</span>
            </div>
            <h1 className="text-2xl font-bold mb-3 text-slate-200">Schedule Analysis</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Upload 1–10 Primavera P6 .xer exports. Multiple weekly snapshots unlock PPC and float erosion tracking.
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              "Baseline comparison and schedule variance",
              "Multi-contractor SPI performance ranking",
              "AI-powered delay root-cause analysis",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2.5 text-slate-500 text-xs">
                <div className="w-1 h-1 bg-blue-500/60 rounded-full shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/[0.07] pt-6 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs">{user?.name || user?.email}</p>
            <p className="text-slate-700 text-[10px]">{user?.role}</p>
          </div>
          <button onClick={() => { clearToken(); router.replace("/login"); }} className="text-slate-600 hover:text-slate-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right upload panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-100">Schedule Analysis</h2>
            <p className="text-slate-500 text-sm mt-1">Upload your XER files to generate a full programme health report.</p>
          </div>

          <div className="bg-[#0D1829] rounded-2xl shadow-2xl shadow-black/40 border border-white/[0.07] overflow-hidden">
            {/* File type toggle */}
            <div className="px-4 pt-4 flex gap-2">
              <button
                onClick={() => handleFileTypeChange("update")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${fileType === "update" ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30" : "bg-white/[0.04] text-slate-500 hover:bg-white/[0.07] border border-white/[0.07]"}`}
              >
                Update Snapshot
              </button>
              <button
                onClick={() => handleFileTypeChange("baseline")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${fileType === "baseline" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30" : "bg-white/[0.04] text-slate-500 hover:bg-white/[0.07] border border-white/[0.07]"}`}
              >
                Baseline
              </button>
            </div>

            {/* Drop zone */}
            <div
              className={`relative m-4 rounded-xl border-2 border-dashed p-8 transition-all ${
                dragging
                  ? "border-blue-500/60 bg-blue-500/[0.05]"
                  : "border-white/[0.1] hover:border-white/[0.18] hover:bg-white/[0.02]"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            >
              <input
                type="file"
                multiple={fileType !== "baseline"}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 10 }}
                onChange={(e) => addFiles(e.target.files)}
              />
              <div className="flex flex-col items-center gap-3 pointer-events-none text-center">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${dragging ? "bg-blue-500/15 border-blue-500/30" : "bg-white/[0.04] border-white/[0.08]"}`}>
                  <svg className={`w-6 h-6 transition-colors ${dragging ? "text-blue-400" : "text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-400">{dragging ? "Drop files here" : "Click or drag XER files"}</p>
                <p className="text-xs text-slate-600">{maxFilesLabel}</p>
              </div>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="px-4 pb-2 space-y-1.5">
                {files.map((f) => (
                  <div key={f.name} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5">
                    <div className="w-7 h-7 bg-blue-600/20 border border-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-blue-400 text-[8px] font-bold">XER</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-300 truncate">{f.name}</p>
                      <p className="text-[10px] text-slate-600">{(f.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button onClick={() => setFiles((p) => p.filter((x) => x.name !== f.name))} className="text-slate-600 hover:text-slate-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mx-4 mb-3 bg-red-500/[0.08] border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl">{error}</div>
            )}

            <div className="p-4 border-t border-white/[0.06] bg-white/[0.01]">
              <button
                onClick={handleAnalyze}
                disabled={loading || files.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all text-sm shadow-lg shadow-blue-900/20"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Analysing…
                  </>
                ) : files.length === 0 ? (
                  "Select files above"
                ) : (
                  `Analyse ${files.length} file${files.length > 1 ? "s" : ""} →`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
