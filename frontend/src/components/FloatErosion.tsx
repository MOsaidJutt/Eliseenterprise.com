"use client";
import { FloatErosionRow } from "@/lib/api";

function ErosionMeter({ pct }: { pct: number }) {
  const color = pct > 70 ? "var(--danger)" : pct > 40 ? "var(--warn)" : "var(--success)";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-raised)", minWidth: 80 }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="font-bold tabular-nums" style={{ fontSize: 12, color, fontFamily: "'JetBrains Mono', monospace", minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

export default function FloatErosion({ data }: { data: FloatErosionRow[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(13,27,62,0.06)" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-bold" style={{ fontSize: 14, color: "var(--text-primary)" }}>Float Erosion</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Total float consumed across snapshots</p>
        </div>
        <div className="p-10 text-center">
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Upload 2+ XER snapshots to compute float erosion.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(13,27,62,0.06)" }}>
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <h3 className="font-bold" style={{ fontSize: 14, color: "var(--text-primary)" }}>Float Erosion</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Total float consumed across schedule snapshots</p>
      </div>
      <div className="p-6 space-y-4">
        {data.map((row, i) => (
          <div key={i} className="rounded-xl p-4"
            style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold" style={{ fontSize: 13, color: "var(--text-primary)" }}>
                  {row.previous_dd} → {row.current_dd}
                </p>
                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                  {row.total_compared.toLocaleString()} activities compared
                </p>
              </div>
              <span className="font-bold tabular-nums" style={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                color: row.eroded_float_days < -100 ? "var(--danger)" : row.eroded_float_days < 0 ? "var(--warn)" : "var(--success)",
              }}>
                {row.eroded_float_days.toLocaleString()}d
              </span>
            </div>
            <ErosionMeter pct={row.pct_eroded} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg p-2.5" style={{ background: "var(--danger-light)", border: "1px solid rgba(220,38,38,0.15)" }}>
                <p style={{ fontSize: 10, color: "var(--danger)", opacity: 0.8, marginBottom: 2 }}>Float Eroded</p>
                <p className="font-bold" style={{ fontSize: 14, color: "var(--danger)", fontFamily: "'JetBrains Mono', monospace" }}>{row.eroded_activities.toLocaleString()} activities</p>
              </div>
              <div className="rounded-lg p-2.5" style={{ background: "var(--success-light)", border: "1px solid rgba(5,150,105,0.15)" }}>
                <p style={{ fontSize: 10, color: "var(--success)", opacity: 0.8, marginBottom: 2 }}>Float Gained</p>
                <p className="font-bold" style={{ fontSize: 14, color: "var(--success)", fontFamily: "'JetBrains Mono', monospace" }}>{row.increased_activities.toLocaleString()} activities</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
