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
import FileHistorySidebar from "@/components/FileHistorySidebar";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(13,27,62,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(13,27,62,0.2)" }}>
        <div className="h-1" style={{ background: "var(--warn)" }} />
        <div className="px-6 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--warn-light)", border: "1px solid rgba(217,119,6,0.2)" }}>
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                style={{ color: "var(--warn)", width: 18, height: 18 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold" style={{ fontSize: 14, color: "var(--text-primary)" }}>Files already analysed</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>The following analyses already contain these files:</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-2.5 max-h-64 overflow-y-auto">
          {duplicates.map((d) => (
            <div key={d.id} className="rounded-xl px-4 py-3 flex items-start justify-between gap-3"
              style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ fontSize: 13, color: "var(--text-primary)" }}>{d.project_name || "Untitled"}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {new Date(d.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  {" · "}
                  <span style={{ fontWeight: 600, color: d.file_type === "baseline" ? "var(--success)" : "var(--primary)" }}>
                    {d.file_type}
                  </span>
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {d.filenames.map((fn) => (
                    <span key={fn} style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--bg-raised)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>
                      {fn}
                    </span>
                  ))}
                </div>
              </div>
              <a href={`/${slug}/dashboard?analysis_id=${d.id}`} target="_blank" rel="noreferrer"
                className="shrink-0 text-xs font-medium rounded-lg px-3 py-1.5 transition-all whitespace-nowrap"
                style={{ color: "var(--primary)", border: "1px solid var(--border-accent)", background: "var(--primary-light)" }}>
                View →
              </a>
            </div>
          ))}
        </div>

        <div className="px-6 pb-5 pt-4 flex gap-2 justify-end" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={onCancel} disabled={overwriting}
            className="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)", background: "var(--bg-card)" }}>
            Cancel
          </button>
          <button onClick={onOverwrite} disabled={overwriting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all text-white"
            style={{ background: overwriting ? "#FCA5A5" : "var(--danger)", cursor: overwriting ? "not-allowed" : "pointer" }}>
            {overwriting && (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            Overwrite &amp; Re-analyse
          </button>
        </div>
      </div>
    </div>
  );
}

type TaggedFile = { file: File; type: "baseline" | "update" };

export default function CompanyUploadPage() {
  const params = useParams();
  const slug   = params.slug as string;
  const router = useRouter();
  const [company,     setCompany]     = useState<CompanyInfo | null>(null);
  const [files,       setFiles]       = useState<TaggedFile[]>([]);
  const [tab,         setTab]         = useState<"baseline" | "update">("update");
  const [dragging,    setDragging]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [overwriting, setOverwriting] = useState(false);
  const [error,       setError]       = useState("");
  const [user,        setUser]        = useState<ReturnType<typeof getUser>>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateAnalysis[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    setUser(getUser());
    fetchCompany(slug).then(setCompany).catch(() => {});
  }, [slug, router]);

  function addFiles(fl: FileList | null) {
    if (!fl) return;
    const xers = Array.from(fl).filter((f) => f.name.toLowerCase().endsWith(".xer"));
    if (xers.length === 0) { setError("Please select .xer files."); return; }
    if (tab === "baseline") {
      setFiles([{ file: xers[0], type: "baseline" }]);
      if (xers.length > 1) setError("Baseline accepts 1 file only — first file selected.");
      else setError("");
      return;
    }
    setFiles((prev) => {
      const incoming = xers.map((f) => ({ file: f, type: "update" as const }));
      const combined = [...prev, ...incoming];
      const unique   = combined.filter((tf, i, arr) => arr.findIndex((x) => x.file.name === tf.file.name) === i);
      return unique.slice(0, 10);
    });
    setError("");
  }

  function toggleFileTag(name: string) {
    setFiles((prev) =>
      prev.map((tf) =>
        tf.file.name === name ? { ...tf, type: tf.type === "baseline" ? "update" : "baseline" } : tf
      )
    );
  }

  function handleTabChange(type: "baseline" | "update") {
    setTab(type);
    if (type === "baseline" && files.length > 1) {
      setFiles([files[0]]);
      setError("Baseline accepts 1 file only.");
    } else {
      setError("");
    }
  }

  async function handleAnalyze() {
    if (files.length === 0) { setError("Select at least one XER file."); return; }
    setLoading(true);
    setError("");
    const effectiveType = files.some((tf) => tf.type === "baseline") ? "baseline" : "update";
    try {
      const result = await analyzeXerFiles(files.map((tf) => tf.file), effectiveType, "", false);
      if ("duplicate" in result && result.duplicate === true) {
        setDuplicateInfo((result as DuplicateResponse).duplicate_analyses);
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
    const effectiveType = files.some((tf) => tf.type === "baseline") ? "baseline" : "update";
    try {
      const result = await analyzeXerFiles(files.map((tf) => tf.file), effectiveType, "", true);
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
  const maxFilesLabel = tab === "baseline" ? "1 .xer file only" : "Up to 10 .xer files";

  return (
    <main className="h-screen overflow-hidden flex" style={{ background: "var(--bg-app)" }}>

      {duplicateInfo && (
        <DuplicateModal slug={slug} duplicates={duplicateInfo} onCancel={() => setDuplicateInfo(null)} onOverwrite={handleOverwrite} overwriting={overwriting} />
      )}

      {/* File History Sidebar (slide-in from left) */}
      <div className={`${historyOpen ? "w-64" : "w-0"} shrink-0 transition-all duration-300 overflow-hidden`}>
        <div className="w-64 h-full">
          <FileHistorySidebar
            onSelect={(id) => { router.push(`/${slug}/dashboard/${id}`); }}
            onNewAnalysis={() => setHistoryOpen(false)}
          />
        </div>
      </div>

      {/* Left nav sidebar */}
      <div className="hidden lg:flex flex-col justify-between w-72 xl:w-80 shrink-0"
        style={{ background: "var(--bg-nav)", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "2rem" }}>
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            {logoUrl ? (
              <img src={logoUrl} alt={company?.name} className="h-8 w-auto object-contain" />
            ) : (
              <img src="/plainview-logo.png" alt="PlainView" className="h-8 w-auto object-contain max-w-[130px]"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <div>
              <p className="font-bold" style={{ fontSize: 13, color: "#E2E8F0", lineHeight: 1.3 }}>{company?.name || slug}</p>
              <p style={{ fontSize: 11, color: "#475569" }}>Programme Analytics</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
              style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)" }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#60A5FA" }} />
              <span style={{ fontSize: 11, color: "#93C5FD", fontWeight: 600 }}>Upload XER Files</span>
            </div>
            <h1 className="font-bold mb-3" style={{ fontSize: 22, color: "#F1F5F9" }}>Schedule Analysis</h1>
            <p style={{ color: "#64748B", fontSize: 13, lineHeight: 1.65 }}>
              Upload Primavera P6 .xer exports. Multiple snapshots unlock PPC and float erosion tracking.
            </p>
          </div>

          <div className="space-y-3">
            {[
              "Baseline comparison and schedule variance",
              "Multi-contractor SPI performance ranking",
              "AI-powered delay root-cause analysis",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2.5" style={{ color: "#64748B", fontSize: 12 }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#3B82F6" }} />
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-5 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => setHistoryOpen(o => !o)}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 transition-colors"
            style={{
              fontSize: 11, fontWeight: 600,
              background: historyOpen ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.04)",
              color: historyOpen ? "#93C5FD" : "#64748B",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {historyOpen ? "Hide History" : "Browse Previous Analyses"}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: "#64748B", fontSize: 12 }}>{user?.name || user?.email}</p>
              <p style={{ color: "#334155", fontSize: 11 }}>{user?.role}</p>
            </div>
            <div className="flex items-center gap-3">
              {user?.role === "admin" && (
                <a href="/admin" title="Admin Panel" style={{ color: "#475569" }}
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
      </div>

      {/* Main upload area */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-lg">

          <div className="mb-8">
            <h2 className="font-bold" style={{ fontSize: 24, color: "var(--text-primary)" }}>Upload Schedule Files</h2>
            <p className="mt-1" style={{ fontSize: 14, color: "var(--text-muted)" }}>
              Generate a full programme health report from your XER exports.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(13,27,62,0.07)" }}>

            {/* File type toggle — sets the default tag for newly added files */}
            <div className="px-5 pt-5 pb-4 flex gap-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
              <button
                onClick={() => handleTabChange("update")}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all"
                style={tab === "update"
                  ? { background: "var(--primary)", color: "#fff", boxShadow: "0 4px 12px rgba(30,64,175,0.25)" }
                  : { background: "var(--bg-card2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                Update Snapshot
              </button>
              <button
                onClick={() => handleTabChange("baseline")}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all"
                style={tab === "baseline"
                  ? { background: "var(--success)", color: "#fff", boxShadow: "0 4px 12px rgba(5,150,105,0.25)" }
                  : { background: "var(--bg-card2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                Baseline
              </button>
            </div>

            {/* Drop zone */}
            <div className="p-5">
              <div
                className="relative rounded-xl p-10 transition-all cursor-pointer"
                style={{
                  border: `2px dashed ${dragging ? "var(--primary)" : "var(--border-md)"}`,
                  background: dragging ? "var(--primary-light)" : "var(--bg-card2)",
                }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
              >
                <input
                  type="file" multiple={tab !== "baseline"}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 10 }}
                  onChange={(e) => addFiles(e.target.files)}
                />
                <div className="flex flex-col items-center gap-3 pointer-events-none text-center">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all"
                    style={{
                      background: dragging ? "var(--primary-light)" : "var(--bg-raised)",
                      border: `1px solid ${dragging ? "var(--primary)" : "var(--border)"}`,
                    }}>
                    <svg style={{ width: 22, height: 22, color: dragging ? "var(--primary)" : "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="font-semibold" style={{ fontSize: 14, color: dragging ? "var(--primary)" : "var(--text-secondary)" }}>
                    {dragging ? "Drop files here" : "Click or drag XER files"}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{maxFilesLabel}</p>
                </div>
              </div>
            </div>

            {/* File list — each file keeps its own tag; click tag to toggle */}
            {files.length > 0 && (
              <div className="px-5 pb-3 space-y-2">
                {files.map((tf) => (
                  <div key={tf.file.name} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: tf.type === "baseline" ? "rgba(5,150,105,0.1)" : "rgba(30,64,175,0.08)",
                        border: `1px solid ${tf.type === "baseline" ? "rgba(5,150,105,0.2)" : "rgba(30,64,175,0.15)"}`,
                      }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: tf.type === "baseline" ? "var(--success)" : "var(--primary)", fontFamily: "monospace" }}>XER</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" style={{ fontSize: 13, color: "var(--text-primary)" }}>{tf.file.name}</p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{(tf.file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      onClick={() => toggleFileTag(tf.file.name)}
                      title="Click to change tag"
                      className="text-xs font-semibold shrink-0 rounded-full px-2.5 py-1 transition-all"
                      style={{
                        background: tf.type === "baseline" ? "var(--success-light)" : "var(--primary-light)",
                        color: tf.type === "baseline" ? "var(--success)" : "var(--primary)",
                        border: `1px solid ${tf.type === "baseline" ? "rgba(5,150,105,0.25)" : "rgba(30,64,175,0.2)"}`,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                    >
                      {tf.type === "baseline" ? "Baseline" : "Update"}
                    </button>
                    <button onClick={() => setFiles((p) => p.filter((x) => x.file.name !== tf.file.name))}
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mx-5 mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                style={{ background: "var(--danger-light)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--danger)" }}>
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Analyse button */}
            <div className="p-5" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card2)" }}>
              <button
                onClick={handleAnalyze}
                disabled={loading || files.length === 0}
                className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all text-sm"
                style={{
                  background: loading || files.length === 0 ? "var(--border-md)" : "var(--primary)",
                  color: "#fff",
                  cursor: loading || files.length === 0 ? "not-allowed" : "pointer",
                  boxShadow: loading || files.length === 0 ? "none" : "0 4px 14px rgba(30,64,175,0.28)",
                }}>
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
