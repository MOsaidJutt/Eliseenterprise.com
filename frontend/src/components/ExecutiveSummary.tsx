"use client";
import { KPIs, Milestone, SPIContractor, FloatErosionRow } from "@/lib/api";

interface Props {
  kpis: KPIs;
  observations: string[];
  spi_by_contractor?: SPIContractor[];
  milestones?: Milestone[];
  float_erosion?: FloatErosionRow[];
}

type RiskLevel = "high" | "medium" | "low";

function getRisk(spi: number, critPct: number, negFloat: number): RiskLevel {
  if (spi < 0.85 || critPct > 70 || negFloat > 50) return "high";
  if (spi < 0.95 || critPct > 40 || negFloat > 20) return "medium";
  return "low";
}

const RISK = {
  high:   { strip: "#DC2626", badge: { bg: "#FEF2F2", border: "rgba(220,38,38,0.2)", text: "#DC2626" }, header: { bg: "#FEF2F2", border: "rgba(220,38,38,0.15)" }, dot: "#DC2626", label: "High Risk" },
  medium: { strip: "#D97706", badge: { bg: "#FFFBEB", border: "rgba(217,119,6,0.2)",  text: "#B45309" }, header: { bg: "#FFFBEB", border: "rgba(217,119,6,0.15)"  }, dot: "#D97706", label: "At Risk" },
  low:    { strip: "#059669", badge: { bg: "#ECFDF5", border: "rgba(5,150,105,0.2)",  text: "#047857" }, header: { bg: "#F0FDF4", border: "rgba(5,150,105,0.15)"  }, dot: "#059669", label: "On Track" },
};

function MetricCell({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
      <p className="font-bold uppercase tracking-widest mb-1" style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.08em" }}>{label}</p>
      <p className="font-bold tabular-nums" style={{ fontSize: 15, color: alert ? "var(--danger)" : "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
    </div>
  );
}

export default function ExecutiveSummary({ kpis, observations, spi_by_contractor = [], milestones = [], float_erosion = [] }: Props) {
  const risk = getRisk(kpis.spi, kpis.critical_path_risk_pct, kpis.neg_float_activities);
  const rs   = RISK[risk];

  const worstContractor  = spi_by_contractor.length > 0 ? [...spi_by_contractor].sort((a, b) => a.spi - b.spi)[0] : null;
  const delayedMilestones= milestones.filter(m => m.variance_days < 0);
  const mostDelayed      = delayedMilestones.sort((a, b) => a.variance_days - b.variance_days)[0] ?? null;
  const missedCount      = delayedMilestones.length;
  const achievedCount    = milestones.filter(m => m.actual !== "").length;
  const worstErosion     = float_erosion.length > 0 ? [...float_erosion].sort((a, b) => b.pct_eroded - a.pct_eroded)[0] : null;

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
    bullets.push(`Float erosion accelerating — ${worstErosion.pct_eroded}% of activities lost float between ${worstErosion.previous_dd} and ${worstErosion.current_dd}.`);

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
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(13,27,62,0.06)" }}>
      <div className="h-[3px] w-full" style={{ background: rs.strip }} />

      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between gap-3"
        style={{ background: rs.header.bg, borderBottom: `1px solid ${rs.header.border}` }}>
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="font-bold" style={{ fontSize: 14, color: "var(--text-primary)" }}>Executive Insight Summary</h3>
        </div>
        <span className="shrink-0 font-bold px-3 py-1 rounded-lg" style={{ fontSize: 11, background: rs.badge.bg, border: `1px solid ${rs.badge.border}`, color: rs.badge.text }}>
          {rs.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Narrative */}
          <div className="lg:col-span-3 space-y-3">
            {bullets.length === 0 ? (
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Programme data loaded. No critical issues auto-detected — review sections below.</p>
            ) : (
              bullets.map((b, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-2" style={{ background: rs.dot }} />
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65 }}>{b}</p>
                </div>
              ))
            )}

            <div className="rounded-xl p-4 mt-4" style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
              <p className="font-bold uppercase tracking-wider mb-1.5" style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                Recommended Action
              </p>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65 }}>{recommendation}</p>
            </div>
          </div>

          {/* Quick metrics */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-2.5 content-start">
            <MetricCell label="SPI"          value={kpis.spi.toFixed(2)}                                alert={kpis.spi < 0.95} />
            <MetricCell label="Delay"        value={kpis.delay_days > 0 ? `${kpis.delay_days}d` : "None"} alert={kpis.delay_days > 0} />
            <MetricCell label="Progress"     value={`${kpis.overall_pct_complete}%`}                   alert={kpis.overall_pct_complete < 50} />
            <MetricCell label="Critical Acts" value={kpis.critical_activities}                           alert={kpis.critical_activities > 50} />
            <MetricCell label="Neg Float"    value={kpis.neg_float_activities}                           alert={kpis.neg_float_activities > 0} />
            <MetricCell label="Missed MS"    value={missedCount}                                          alert={missedCount > 0} />
            <MetricCell label="Achieved MS"  value={achievedCount} />
            <MetricCell label="CP Risk"      value={`${kpis.critical_path_risk_pct}%`}                  alert={kpis.critical_path_risk_pct > 40} />
          </div>
        </div>
      </div>
    </div>
  );
}
