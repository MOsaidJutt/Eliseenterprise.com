"use client";

const SEVERITY = ["bad", "bad", "bad", "warn", "warn", "neutral"] as const;
type Sev = (typeof SEVERITY)[number];

const SEV: Record<Sev, { bg: string; border: string; dot: string; num: string; text: string }> = {
  bad:     { bg: "bg-red-500/[0.06]",   border: "border-red-500/20",   dot: "bg-red-500",   num: "bg-red-500 text-white",    text: "text-slate-300" },
  warn:    { bg: "bg-amber-500/[0.06]", border: "border-amber-500/20", dot: "bg-amber-400", num: "bg-amber-400 text-white",  text: "text-slate-300" },
  neutral: { bg: "bg-white/[0.02]",     border: "border-white/[0.07]", dot: "bg-slate-500", num: "bg-slate-600 text-slate-300", text: "text-slate-400" },
};

export default function ObservationsPanel({ observations }: { observations: string[] }) {
  return (
    <div className="bg-[#0D1829] rounded-2xl border border-white/[0.07] shadow-xl shadow-black/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Observations &amp; Risk Summary</h3>
          <p className="text-xs text-slate-500 mt-0.5">Auto-generated from schedule metrics</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-lg">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {observations.length} finding{observations.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="p-6">
        {observations.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No observations available.</p>
        ) : (
          <div className="space-y-3">
            {observations.map((obs, i) => {
              const sev: Sev = SEVERITY[i] ?? "neutral";
              const s = SEV[sev];
              return (
                <div key={i} className={`flex gap-3 p-4 rounded-xl border ${s.bg} ${s.border}`}>
                  <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${s.num}`}>
                    {i + 1}
                  </div>
                  <p className={`text-sm leading-relaxed ${s.text}`}>{obs}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
