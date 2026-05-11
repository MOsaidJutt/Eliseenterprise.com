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
    <div className="flex flex-col h-full" style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold uppercase tracking-widest" style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em" }}>History</p>
          <span className="tabular-nums" style={{ fontSize: 10, color: "var(--text-muted)" }}>{total} saved</span>
        </div>
        <button
          onClick={onNewAnalysis}
          className="w-full flex items-center justify-center gap-2 font-semibold py-2 rounded-lg transition-all text-white text-xs"
          style={{ background: "var(--primary)", boxShadow: "0 2px 8px rgba(30,64,175,0.2)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--primary)")}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Analysis
        </button>

        {/* Filter tabs */}
        <div className="flex gap-1 mt-2 p-0.5 rounded-lg" style={{ background: "var(--bg-raised)" }}>
          {(["", "baseline", "update"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 py-1 rounded-md font-semibold transition-colors text-center"
              style={{
                fontSize: 10,
                background: filter === f ? "var(--bg-card)" : "transparent",
                color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: filter === f ? "0 1px 3px rgba(13,27,62,0.08)" : "none",
              }}>
              {f === "" ? "All" : f === "baseline" ? "Baseline" : "Updates"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 rounded-full border-2 border-t-blue-600 animate-spin"
              style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)" }} />
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No analyses yet.</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, opacity: 0.7 }}>Upload XER files to get started.</p>
          </div>
        ) : (
          <div>
            {items.map((item) => {
              const isActive = item.id === currentAnalysisId;
              const displayName = item.project_name || item.filenames[0] || "Unnamed";

              return (
                <div
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className="px-4 py-3 cursor-pointer transition-all group"
                  style={{
                    borderBottom: "1px solid var(--border)",
                    borderLeft: `3px solid ${isActive ? "var(--primary)" : "transparent"}`,
                    background: isActive ? "var(--primary-light)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "var(--bg-card2)"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
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
                            className="w-full rounded outline-none px-2 py-1"
                            style={{ fontSize: 12, background: "var(--bg-raised)", border: "1px solid var(--primary)", color: "var(--text-primary)" }}
                          />
                        </div>
                      ) : (
                        <p
                          onDoubleClick={(e) => startRename(item, e)}
                          className="font-semibold truncate leading-tight cursor-text"
                          style={{ fontSize: 12, color: isActive ? "var(--primary)" : "var(--text-primary)" }}
                          title="Double-click to rename"
                        >
                          {displayName}
                        </p>
                      )}
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{timeAgo(item.created_at)}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleToggleType(item, e)}
                        title="Click to toggle type"
                        className="font-semibold rounded-full px-2 py-0.5 transition-colors whitespace-nowrap"
                        style={{
                          fontSize: 9,
                          background: item.file_type === "baseline" ? "var(--success-light)" : "var(--primary-light)",
                          color: item.file_type === "baseline" ? "var(--success)" : "var(--primary)",
                          border: `1px solid ${item.file_type === "baseline" ? "rgba(5,150,105,0.2)" : "rgba(30,64,175,0.15)"}`,
                        }}>
                        {item.file_type === "baseline" ? "Baseline" : "Update"}
                      </button>

                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-all p-0.5"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* File names */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.filenames.slice(0, 2).map((f) => (
                      <span key={f} className="truncate"
                        style={{ fontSize: 9, background: "var(--bg-raised)", color: "var(--text-muted)", padding: "2px 5px", borderRadius: 4, fontFamily: "monospace", maxWidth: 120 }}>{f}</span>
                    ))}
                    {item.filenames.length > 2 && (
                      <span style={{ fontSize: 9, color: "var(--text-muted)" }}>+{item.filenames.length - 2}</span>
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
                        className="w-full rounded outline-none px-2 py-1"
                        style={{ fontSize: 11, background: "var(--bg-raised)", border: "1px solid var(--border-md)", color: "var(--text-secondary)" }}
                      />
                    </div>
                  ) : item.notes ? (
                    <p
                      className="mt-1.5 italic cursor-text"
                      style={{ fontSize: 10, color: "var(--text-muted)" }}
                      onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditNote(item.notes ?? ""); }}
                    >
                      {item.notes}
                    </p>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditNote(""); }}
                      className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ fontSize: 9, color: "var(--text-muted)" }}>
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
