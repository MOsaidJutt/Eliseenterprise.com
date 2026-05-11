"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchAnalyses, deleteAnalysis, patchAnalysis, AnalysisListItem } from "@/lib/api";

interface Props {
  currentAnalysisId?: number;
  onSelect: (id: number) => void;
  onNewAnalysis: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}

export default function FileHistorySidebar({ currentAnalysisId, onSelect, onNewAnalysis }: Props) {
  const [items,      setItems]      = useState<AnalysisListItem[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<"" | "baseline" | "update">("");
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [editNote,   setEditNote]   = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameVal,  setRenameVal]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAnalyses({ limit: 40, file_type: filter || undefined });
      setItems(res.items);
      setTotal(res.total);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this analysis?")) return;
    await deleteAnalysis(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setTotal((t) => t - 1);
  }

  async function handleToggleType(item: AnalysisListItem, e: React.MouseEvent) {
    e.stopPropagation();
    const next = item.file_type === "baseline" ? "update" : "baseline";
    await patchAnalysis(item.id, { file_type: next });
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, file_type: next } : i));
  }

  async function saveNote(id: number) {
    await patchAnalysis(id, { notes: editNote });
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, notes: editNote } : i));
    setEditingId(null);
  }

  async function saveRename(id: number) {
    const val = renameVal.trim();
    if (!val) { setRenamingId(null); return; }
    await patchAnalysis(id, { project_name: val });
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, project_name: val } : i));
    setRenamingId(null);
  }

  function startRename(item: AnalysisListItem, e: React.MouseEvent) {
    e.stopPropagation();
    setRenamingId(item.id);
    setRenameVal(item.project_name || item.filenames[0] || "");
  }

  return (
    <div className="flex flex-col h-full bg-[#080E1C] text-white border-r border-white/[0.06]">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.07] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">History</p>
          <span className="text-[10px] text-slate-700 tabular-nums">{total} saved</span>
        </div>
        <button
          onClick={onNewAnalysis}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-900/30"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Analysis
        </button>

        {/* Filter tabs */}
        <div className="flex gap-1 mt-2">
          {(["", "baseline", "update"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 text-[10px] py-1 rounded-md font-semibold transition-colors ${filter === f ? "bg-white/[0.1] text-slate-200" : "text-slate-600 hover:text-slate-400"}`}
            >
              {f === "" ? "All" : f === "baseline" ? "Baseline" : "Updates"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-slate-600 text-xs">No analyses yet.</p>
            <p className="text-slate-700 text-[10px] mt-1">Upload XER files to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {items.map((item) => {
              const isActive = item.id === currentAnalysisId;
              const displayName = item.project_name || item.filenames[0] || "Unnamed";

              return (
                <div
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`px-4 py-3 cursor-pointer transition-all group ${isActive ? "bg-blue-600/[0.12] border-l-2 border-blue-500" : "hover:bg-white/[0.03] border-l-2 border-transparent"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Rename mode */}
                      {renamingId === item.id ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <input
                            autoFocus
                            value={renameVal}
                            onChange={(e) => setRenameVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRename(item.id);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            onBlur={() => saveRename(item.id)}
                            className="w-full bg-white/[0.07] text-slate-200 text-xs px-2 py-1 rounded outline-none border border-blue-500/40 placeholder-slate-700"
                          />
                        </div>
                      ) : (
                        <p
                          onDoubleClick={(e) => startRename(item, e)}
                          className="text-xs font-semibold text-slate-300 truncate leading-tight cursor-text"
                          title="Double-click to rename"
                        >
                          {displayName}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-600 mt-0.5">{timeAgo(item.created_at)}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Baseline / Update badge */}
                      <button
                        onClick={(e) => handleToggleType(item, e)}
                        title="Click to toggle type"
                        className={`text-[9px] px-2 py-0.5 rounded-full font-semibold transition-colors whitespace-nowrap ${
                          item.file_type === "baseline"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {item.file_type === "baseline" ? "Baseline" : "Update"}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all p-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* File names */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.filenames.slice(0, 2).map((f) => (
                      <span key={f} className="text-[9px] bg-white/[0.04] text-slate-600 px-1.5 py-0.5 rounded font-mono truncate max-w-[120px]">{f}</span>
                    ))}
                    {item.filenames.length > 2 && (
                      <span className="text-[9px] text-slate-700">+{item.filenames.length - 2}</span>
                    )}
                  </div>

                  {/* Note editing */}
                  {editingId === item.id ? (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveNote(item.id); if (e.key === "Escape") setEditingId(null); }}
                        placeholder="Add a note…"
                        className="w-full bg-white/[0.07] text-slate-300 text-[10px] px-2 py-1 rounded outline-none border border-white/[0.1] placeholder-slate-700"
                      />
                    </div>
                  ) : item.notes ? (
                    <p
                      className="mt-1.5 text-[10px] text-slate-600 italic cursor-text"
                      onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditNote(item.notes ?? ""); }}
                    >
                      {item.notes}
                    </p>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditNote(""); }}
                      className="mt-1 text-[9px] text-slate-700 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      + Add note
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
