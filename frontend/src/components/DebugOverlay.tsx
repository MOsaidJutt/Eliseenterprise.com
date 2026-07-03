"use client";
import { useEffect, useState } from "react";
import { getLog, clearLog } from "@/lib/debugLog";

// Temporary on-screen diagnostic trail for chasing the mobile Safari login
// issue. Safe to delete once resolved — reads only from sessionStorage.
export default function DebugOverlay() {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const update = () => setLog(getLog());
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 14, right: 14, zIndex: 999999,
          width: 42, height: 42, borderRadius: "50%", background: "#DC2626",
          color: "#fff", fontSize: 18, border: "none",
          boxShadow: "0 2px 10px rgba(0,0,0,.45)",
        }}
      >
        🐞
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", left: 8, right: 8, bottom: 8, maxHeight: "65vh",
      zIndex: 999999, background: "rgba(15,23,42,0.97)", color: "#E2E8F0",
      borderRadius: 12, border: "1px solid rgba(255,255,255,.15)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,.1)", flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>Debug Trail</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { clearLog(); setLog([]); }}
            style={{ fontSize: 11, color: "#94A3B8", background: "transparent", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, padding: "3px 8px" }}>
            Clear
          </button>
          <button onClick={() => setOpen(false)}
            style={{ fontSize: 11, color: "#94A3B8", background: "transparent", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, padding: "3px 8px" }}>
            Close
          </button>
        </div>
      </div>
      <div style={{ padding: "8px 12px", overflowY: "auto", fontFamily: "monospace", fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {log.length === 0
          ? <span style={{ color: "#64748B" }}>No events yet — log in and watch this fill up.</span>
          : log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
