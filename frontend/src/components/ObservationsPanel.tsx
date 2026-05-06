"use client";

const SEVERITY = ["bad", "bad", "bad", "warn", "warn", "neutral"] as const;
type Sev = (typeof SEVERITY)[number];

const SEV_STYLES: Record<Sev, { bg: string; border: string; dot: string; num: string }> = {
  bad:     { bg: "bg-red-50",    border: "border-red-200",   dot: "bg-red-500",    num: "bg-red-500 text-white" },
  warn:    { bg: "bg-amber-50",  border: "border-amber-200", dot: "bg-amber-400",  num: "bg-amber-400 text-white" },
  neutral: { bg: "bg-slate-50",  border: "border-slate-200", dot: "bg-slate-400",  num: "bg-slate-500 text-white" },
};

export default function ObservationsPanel({ observations }: { observations: string[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Observations & Risk Summary</h3>
          <p className="text-xs text-slate-400 mt-0.5">Auto-generated from schedule metrics</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {observations.length} finding{observations.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="p-6">
        {observations.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No observations available.</p>
        ) : (
          <div className="space-y-3">
            {observations.map((obs, i) => {
              const sev: Sev = SEVERITY[i] ?? "neutral";
              const s = SEV_STYLES[sev];
              return (
                <div key={i} className={`flex gap-3 p-4 rounded-xl border ${s.bg} ${s.border}`}>
                  <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${s.num}`}>
                    {i + 1}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{obs}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
