"use client";

const SEVERITY = ["bad", "bad", "bad", "warn", "warn", "neutral"] as const;
type Sev = (typeof SEVERITY)[number];

const SEV: Record<Sev, { bg: string; border: string; dot: string; num: string; numText: string; text: string }> = {
  bad:     { bg: "#FEF2F2", border: "rgba(220,38,38,0.18)",   dot: "#DC2626", num: "#DC2626", numText: "#fff", text: "var(--text-secondary)" },
  warn:    { bg: "#FFFBEB", border: "rgba(217,119,6,0.18)",   dot: "#D97706", num: "#D97706", numText: "#fff", text: "var(--text-secondary)" },
  neutral: { bg: "var(--bg-card2)", border: "var(--border)",  dot: "#94A3B8", num: "#94A3B8", numText: "#fff", text: "var(--text-muted)" },
};

export default function ObservationsPanel({ observations }: { observations: string[] }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(13,27,62,0.06)" }}>

      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div>
          <h3 className="font-bold" style={{ fontSize: 14, color: "var(--text-primary)" }}>Observations &amp; Risk Summary</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Auto-generated from schedule metrics</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
          style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text-secondary)" }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {observations.length} finding{observations.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="p-6">
        {observations.length === 0 ? (
          <p className="text-center py-4" style={{ fontSize: 14, color: "var(--text-muted)" }}>No observations available.</p>
        ) : (
          <div className="space-y-3">
            {observations.map((obs, i) => {
              const sev: Sev = SEVERITY[i] ?? "neutral";
              const s = SEV[sev];
              return (
                <div key={i} className="flex gap-3.5 p-4 rounded-xl"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-bold mt-0.5"
                    style={{ fontSize: 10, background: s.num, color: s.numText, minWidth: 20 }}>
                    {i + 1}
                  </div>
                  <p style={{ fontSize: 14, color: s.text, lineHeight: 1.6 }}>{obs}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
