"use client";
import { KPIs } from "@/lib/api";

interface CardProps {
  label: string;
  value: string | number;
  sub?: string;
  sub2?: string;
  status?: "good" | "warn" | "bad" | "neutral";
  progress?: number;
  icon: React.ReactNode;
}

function KPICard({ label, value, sub, sub2, status = "neutral", progress, icon }: CardProps) {
  const statusBar = {
    good: "bg-emerald-500",
    warn: "bg-amber-400",
    bad: "bg-red-500",
    neutral: "bg-slate-400",
  };
  const statusText = {
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-red-600",
    neutral: "text-slate-700",
  };
  const statusBg = {
    good: "bg-emerald-50 border-emerald-100",
    warn: "bg-amber-50 border-amber-100",
    bad: "bg-red-50 border-red-100",
    neutral: "bg-slate-50 border-slate-200",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Top status bar */}
      <div className={`h-1 w-full ${statusBar[status]}`} />
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] leading-tight pr-2">{label}</p>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${statusBg[status]}`}>
            {icon}
          </div>
        </div>

        {/* Value */}
        <p className={`text-3xl font-bold leading-none ${statusText[status]} mb-2`}>{value}</p>

        {/* Progress bar (optional) */}
        {progress !== undefined && (
          <div className="mb-3">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${statusBar[status]}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Subs */}
        {sub && <p className="text-xs text-slate-500 leading-snug">{sub}</p>}
        {sub2 && <p className="text-xs text-slate-400 mt-0.5 leading-snug">{sub2}</p>}
      </div>
    </div>
  );
}

export default function KPISummary({ kpis }: { kpis: KPIs }) {
  const gap = (100 - kpis.overall_pct_complete).toFixed(1);
  const spiStatus = kpis.spi >= 0.95 ? "good" : kpis.spi >= 0.85 ? "warn" : "bad";
  const riskStatus = kpis.critical_path_risk_pct > 70 ? "bad" : kpis.critical_path_risk_pct > 40 ? "warn" : "good";
  const progressStatus = kpis.overall_pct_complete >= 80 ? "good" : kpis.overall_pct_complete >= 50 ? "warn" : "bad";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Overall Progress"
        value={`${kpis.overall_pct_complete}%`}
        sub={`Behind baseline by −${gap}%`}
        sub2={`${kpis.completed_activities.toLocaleString()} of ${kpis.total_activities.toLocaleString()} activities complete`}
        status={progressStatus}
        progress={kpis.overall_pct_complete}
        icon={
          <svg className="w-4 h-4 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
      />
      <KPICard
        label="Schedule Performance Index"
        value={kpis.spi.toFixed(2)}
        sub={`SPI < 1.0 means behind plan`}
        sub2={`Data date: ${kpis.data_date}`}
        status={spiStatus}
        icon={
          <svg className="w-4 h-4 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
      />
      <KPICard
        label="Forecast Final Acceptance"
        value={kpis.forecast_end || kpis.planned_end || "—"}
        sub={kpis.delay_days > 0 ? `${kpis.delay_days}d behind baseline` : "Within baseline"}
        sub2={kpis.planned_end ? `Baseline: ${kpis.planned_end}` : undefined}
        status={kpis.delay_days > 0 ? "bad" : "good"}
        icon={
          <svg className="w-4 h-4 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
      />
      <KPICard
        label="Critical Path Risk"
        value={`${kpis.critical_path_risk_pct}%`}
        sub={`${kpis.critical_activities.toLocaleString()} critical activities`}
        sub2={`${kpis.neg_float_activities.toLocaleString()} with negative float`}
        status={riskStatus}
        progress={kpis.critical_path_risk_pct}
        icon={
          <svg className="w-4 h-4 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        }
      />
    </div>
  );
}
