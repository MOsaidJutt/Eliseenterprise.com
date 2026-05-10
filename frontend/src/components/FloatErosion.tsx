"use client";
import { FloatErosionRow } from "@/lib/api";

function ErosionMeter({ pct }: { pct: number }) {
  const color = pct > 70 ? "bg-red-500" : pct > 40 ? "bg-amber-400" : "bg-emerald-500";
  const text  = pct > 70 ? "text-red-400" : pct > 40 ? "text-amber-400" : "text-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden w-20">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-xs font-bold ${text}`}>{pct}%</span>
    </div>
  );
}

export default function FloatErosion({ data }: { data: FloatErosionRow[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-[#0D1829] rounded-2xl border border-white/[0.07] shadow-xl shadow-black/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-slate-200">Float Erosion</h3>
          <p className="text-xs text-slate-500 mt-0.5">Total float consumed across snapshots</p>
        </div>
        <div className="p-10 text-center">
          <p className="text-xs text-slate-600">Upload 2+ XER snapshots to compute float erosion.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0D1829] rounded-2xl border border-white/[0.07] shadow-xl shadow-black/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-bold text-slate-200">Float Erosion</h3>
        <p className="text-xs text-slate-500 mt-0.5">Total float consumed across schedule snapshots</p>
      </div>
      <div className="p-6 space-y-4">
        {data.map((row, i) => (
          <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-slate-300">
                  {row.previous_dd} → {row.current_dd}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">{row.total_compared.toLocaleString()} activities compared</p>
              </div>
              <span className={`text-sm font-bold ${row.eroded_float_days < -100 ? "text-red-400" : row.eroded_float_days < 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {row.eroded_float_days.toLocaleString()}d
              </span>
            </div>
            <ErosionMeter pct={row.pct_eroded} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
                <p className="text-[10px] text-slate-500 mb-0.5">Float Eroded</p>
                <p className="text-sm font-bold text-red-400">{row.eroded_activities.toLocaleString()} activities</p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
                <p className="text-[10px] text-slate-500 mb-0.5">Float Gained</p>
                <p className="text-sm font-bold text-emerald-400">{row.increased_activities.toLocaleString()} activities</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
