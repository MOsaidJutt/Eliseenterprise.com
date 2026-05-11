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

const STATUS = {
  good:    { strip: "#059669", iconBg: "#ECFDF5", iconBorder: "rgba(5,150,105,0.2)",  iconColor: "#059669", val: "#059669",  tag: "#ECFDF5",   tagBorder: "rgba(5,150,105,0.15)",   tagText: "#047857", bar: "#059669" },
  warn:    { strip: "#D97706", iconBg: "#FFFBEB", iconBorder: "rgba(217,119,6,0.2)",  iconColor: "#D97706", val: "#B45309",  tag: "#FFFBEB",   tagBorder: "rgba(217,119,6,0.15)",   tagText: "#92400E", bar: "#D97706" },
  bad:     { strip: "#DC2626", iconBg: "#FEF2F2", iconBorder: "rgba(220,38,38,0.2)",  iconColor: "#DC2626", val: "#DC2626",  tag: "#FEF2F2",   tagBorder: "rgba(220,38,38,0.15)",   tagText: "#991B1B", bar: "#EF4444" },
  neutral: { strip: "#94A3B8", iconBg: "#F8FAFC", iconBorder: "rgba(148,163,184,0.2)", iconColor: "#64748B", val: "#1E40AF", tag: "#EEF2FF",   tagBorder: "rgba(30,64,175,0.1)",    tagText: "#1E40AF", bar: "#94A3B8" },
};

function KPICard({ label, value, sub, sub2, status = "neutral", progress, icon }: CardProps) {
  const s = STATUS[status];
  return (
    <div className="relative rounded-2xl overflow-hidden transition-shadow hover:shadow-lg"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(13,27,62,0.06)" }}>
      <div className="h-[3px] w-full" style={{ background: s.strip }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="font-bold uppercase tracking-wider leading-tight pr-2"
            style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em" }}>{label}</p>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: s.iconBg, border: `1px solid ${s.iconBorder}`, color: s.iconColor }}>
            {icon}
          </div>
        </div>

        <p className="leading-none mb-2 tabular-nums"
          style={{ fontSize: 30, fontWeight: 800, color: s.val, fontFamily: "'JetBrains Mono', monospace" }}>
          {value}
        </p>

        {progress !== undefined && (
          <div className="mb-3">
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--bg-raised)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%`, background: s.bar }} />
            </div>
          </div>
        )}

        {sub  && <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{sub}</p>}
        {sub2 && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>{sub2}</p>}
      </div>
    </div>
  );
}

export default function KPISummary({ kpis }: { kpis: KPIs }) {
  const gap           = (100 - kpis.overall_pct_complete).toFixed(1);
  const spiStatus     = kpis.spi >= 0.95 ? "good" : kpis.spi >= 0.85 ? "warn" : "bad";
  const riskStatus    = kpis.critical_path_risk_pct > 70 ? "bad" : kpis.critical_path_risk_pct > 40 ? "warn" : "good";
  const progressStatus= kpis.overall_pct_complete >= 80 ? "good" : kpis.overall_pct_complete >= 50 ? "warn" : "bad";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Overall Progress"
        value={`${kpis.overall_pct_complete}%`}
        sub={`Behind baseline by −${gap}%`}
        sub2={`${kpis.completed_activities.toLocaleString()} of ${kpis.total_activities.toLocaleString()} complete`}
        status={progressStatus}
        progress={kpis.overall_pct_complete}
        icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
      />
      <KPICard
        label="Schedule Performance Index"
        value={kpis.spi.toFixed(2)}
        sub="SPI < 1.0 means behind plan"
        sub2={`Data date: ${kpis.data_date}`}
        status={spiStatus}
        icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
      />
      <KPICard
        label="Forecast Final Acceptance"
        value={kpis.forecast_end || kpis.planned_end || "—"}
        sub={kpis.delay_days > 0 ? `${kpis.delay_days}d behind baseline` : "Within baseline"}
        sub2={kpis.planned_end ? `Baseline: ${kpis.planned_end}` : undefined}
        status={kpis.delay_days > 0 ? "bad" : "good"}
        icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
      />
      <KPICard
        label="Critical Path Risk"
        value={`${kpis.critical_path_risk_pct}%`}
        sub={`${kpis.critical_activities.toLocaleString()} critical activities`}
        sub2={`${kpis.neg_float_activities.toLocaleString()} with negative float`}
        status={riskStatus}
        progress={kpis.critical_path_risk_pct}
        icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
      />
    </div>
  );
}
