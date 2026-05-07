"use client";
import { AnalysisResult } from "@/lib/api";

type RiskLevel = "high" | "medium" | "low";

function getRisk(spi: number, critPct: number, negFloat: number): RiskLevel {
  if (spi < 0.85 || critPct > 70 || negFloat > 50) return "high";
  if (spi < 0.95 || critPct > 40 || negFloat > 20) return "medium";
  return "low";
}

const RISK = {
  high:   { bar: "bg-red-500",     badge: "bg-red-500 text-white",     border: "border-red-200",   bg: "bg-red-50",     label: "High Risk",  dot: "bg-red-500",   val: "text-red-600" },
  medium: { bar: "bg-amber-400",   badge: "bg-amber-400 text-white",   border: "border-amber-200", bg: "bg-amber-50",   label: "At Risk",    dot: "bg-amber-400", val: "text-amber-600" },
  low:    { bar: "bg-emerald-500", badge: "bg-emerald-500 text-white", border: "border-emerald-200",bg: "bg-emerald-50", label: "On Track",   dot: "bg-emerald-500",val: "text-emerald-600" },
};

function Metric({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className="bg-white/80 rounded-xl p-3 border border-white text-center">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-sm font-bold ${alert ? "text-red-600" : "text-slate-700"}`}>{value}</p>
    </div>
  );
}

export default function ExecutiveSummary({ result }: { result: AnalysisResult }) {
  const { kpis, spi_by_contractor, milestones, float_erosion } = result;

  const risk = getRisk(kpis.spi, kpis.critical_path_risk_pct, kpis.neg_float_activities);
  const rs = RISK[risk];

  const worstContractor = spi_by_contractor.length > 0
    ? [...spi_by_contractor].sort((a, b) => a.spi - b.spi)[0]
    : null;

  const delayedMilestones = milestones.filter(m => m.variance_days < 0);
  const mostDelayed = delayedMilestones.sort((a, b) => a.variance_days - b.variance_days)[0] ?? null;
  const missedCount = delayedMilestones.length;
  const achievedCount = milestones.filter(m => m.actual !== "").length;

  const worstErosion = float_erosion.length > 0
    ? [...float_erosion].sort((a, b) => b.pct_eroded - a.pct_eroded)[0]
    : null;

  // Build narrative bullets
  const bullets: string[] = [];
  if (kpis.delay_days > 0)
    bullets.push(`Programme is ${kpis.delay_days} days behind the baseline finish date (forecast: ${kpis.forecast_end || "TBC"}).`);
  if (worstContractor && worstContractor.spi < 0.90)
    bullets.push(`${worstContractor.contractor} is the primary performance concern with SPI ${worstContractor.spi.toFixed(2)} — the lowest across all contractors.`);
  if (missedCount > 0 && mostDelayed)
    bullets.push(`${missedCount} milestone${missedCount > 1 ? "s are" : " is"} behind schedule. Worst: "${mostDelayed.task_name}" delayed by ${Math.abs(mostDelayed.variance_days)} days.`);
  if (kpis.neg_float_activities > 0)
    bullets.push(`${kpis.neg_float_activities} activities have negative float, indicating the critical path is already overrun.`);
  if (worstErosion && worstErosion.pct_eroded > 40)
    bullets.push(`Float erosion is accelerating — ${worstErosion.pct_eroded}% of activities lost float between ${worstErosion.previous_dd} and ${worstErosion.current_dd}.`);

  // Recommendation
  let recommendation = "";
  if (risk === "high") {
    recommendation = worstContractor && worstContractor.spi < 0.85
      ? `Immediate intervention required with ${worstContractor.contractor}. Issue a formal recovery notice and demand a revised programme within 7 days. Escalate float-negative activities to the Programme Director.`
      : `Programme is at high risk of missing the completion date. Convene an emergency recovery workshop. Prioritise float restoration on the critical path and review contractor resourcing.`;
  } else if (risk === "medium") {
    recommendation = `Monitor schedule performance closely. Validate contractor recovery plans before the next data date. Focus attention on activities with float < 10 days and milestones at risk of slippage.`;
  } else {
    recommendation = `Programme is broadly on track. Maintain current performance and continue weekly snapshot monitoring. Ensure contractors sustain resource levels through upcoming peak delivery periods.`;
  }

  return (
    <div className={`rounded-2xl border ${rs.border} ${rs.bg} overflow-hidden`}>
      <div className={`h-1 w-full ${rs.bar}`} />
      <div className="p-6">

        {/* Title row */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-sm font-bold text-slate-800">Executive Insight Summary</h3>
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg ${rs.badge}`}>{rs.label}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Left: narrative */}
          <div className="lg:col-span-3 space-y-3">
            {bullets.length === 0 ? (
              <p className="text-sm text-slate-600">Programme data loaded. No critical issues auto-detected — review sections below.</p>
            ) : (
              bullets.map((b, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${rs.dot} shrink-0 mt-1.5`} />
                  <p className="text-sm text-slate-700 leading-relaxed">{b}</p>
                </div>
              ))
            )}

            {/* Recommendation */}
            <div className="bg-white/70 rounded-xl p-4 border border-white mt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Recommended Action</p>
              <p className="text-sm text-slate-700 leading-relaxed">{recommendation}</p>
            </div>
          </div>

          {/* Right: quick metrics */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-2.5 content-start">
            <Metric label="SPI" value={kpis.spi.toFixed(2)} alert={kpis.spi < 0.95} />
            <Metric label="Delay" value={kpis.delay_days > 0 ? `${kpis.delay_days}d` : "None"} alert={kpis.delay_days > 0} />
            <Metric label="Progress" value={`${kpis.overall_pct_complete}%`} alert={kpis.overall_pct_complete < 50} />
            <Metric label="Critical Acts" value={kpis.critical_activities} alert={kpis.critical_activities > 50} />
            <Metric label="Neg Float" value={kpis.neg_float_activities} alert={kpis.neg_float_activities > 0} />
            <Metric label="Missed MS" value={missedCount} alert={missedCount > 0} />
            <Metric label="Achieved MS" value={achievedCount} />
            <Metric label="CP Risk" value={`${kpis.critical_path_risk_pct}%`} alert={kpis.critical_path_risk_pct > 40} />
          </div>

        </div>
      </div>
    </div>
  );
}
