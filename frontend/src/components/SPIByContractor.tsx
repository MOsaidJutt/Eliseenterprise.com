"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { SPIContractor } from "@/lib/api";

function spiColor(spi: number) {
  if (spi >= 0.95) return "#059669";
  if (spi >= 0.80) return "#D97706";
  return "#DC2626";
}

function spiBg(spi: number): React.CSSProperties {
  if (spi >= 0.95) return { background: "var(--success-light)", color: "var(--success)", border: "1px solid rgba(5,150,105,0.2)" };
  if (spi >= 0.80) return { background: "var(--warn-light)",    color: "var(--warn)",    border: "1px solid rgba(217,119,6,0.2)" };
  return             { background: "var(--danger-light)",   color: "var(--danger)",   border: "1px solid rgba(220,38,38,0.2)" };
}

function rankStyle(rank: number): React.CSSProperties {
  if (rank === 1) return { background: "var(--success-light)", color: "var(--success)" };
  if (rank === 2) return { background: "var(--warn-light)",    color: "var(--warn)" };
  return             { background: "var(--danger-light)",   color: "var(--danger)" };
}

function impact(spi: number, totalPV: number, pv: number): string {
  const share = totalPV > 0 ? ((pv / totalPV) * 100).toFixed(0) : "0";
  if (spi >= 0.95) return `On track · ${share}% of planned work`;
  if (spi >= 0.85) return `Minor slippage · ${share}% planned work at risk`;
  if (spi >= 0.75) return `Significant delay · ${share}% of programme behind`;
  return `Critical underperformer · ${share}% in jeopardy`;
}

export default function SPIByContractor({ data }: { data: SPIContractor[] }) {
  const sorted  = [...data].sort((a, b) => b.spi - a.spi);
  const chartData = [...data].sort((a, b) => a.spi - b.spi);
  const totalPV = data.reduce((s, d) => s + d.pv, 0);
  const worst   = sorted[sorted.length - 1];
  const best    = sorted[0];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: SPIContractor }> }) => {
    if (!active || !payload?.length) return null;
    const d    = payload[0].payload;
    const rank = sorted.findIndex(r => r.contractor === d.contractor) + 1;
    return (
      <div className="rounded-xl p-3" style={{ background: "#FFFFFF", border: "1px solid var(--border-md)", boxShadow: "0 8px 32px rgba(13,27,62,0.12)", fontSize: 12 }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold px-1.5 py-0.5 rounded" style={{ fontSize: 10, ...rankStyle(rank) }}>#{rank}</span>
          <p className="font-bold" style={{ color: "var(--text-primary)" }}>{d.contractor}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between gap-6"><span style={{ color: "var(--text-muted)" }}>PV (planned)</span><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{d.pv.toLocaleString()}</span></div>
          <div className="flex justify-between gap-6"><span style={{ color: "var(--text-muted)" }}>EV (earned)</span><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{d.ev.toLocaleString()}</span></div>
          <div className="flex justify-between gap-6 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>SPI</span>
            <span className="font-bold" style={{ color: spiColor(d.spi) }}>{d.spi.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(13,27,62,0.06)" }}>
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div>
          <h3 className="font-bold" style={{ fontSize: 14, color: "var(--text-primary)" }}>Contractor Performance Ranking</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Schedule Performance Index — ranked best to worst</p>
        </div>
        <div className="flex items-center gap-3" style={{ fontSize: 10, color: "var(--text-muted)" }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#059669" }} />≥ 0.95</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#D97706" }} />0.80–0.95</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#DC2626" }} />{"< 0.80"}</span>
        </div>
      </div>

      {worst && worst.spi < 0.90 && (
        <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: "var(--danger-light)", border: "1px solid rgba(220,38,38,0.2)" }}>
          <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: "var(--danger)" }} />
          <p style={{ fontSize: 12, color: "var(--danger)", lineHeight: 1.6 }}>
            <span className="font-bold">{worst.contractor}</span> is the weakest performer (SPI {worst.spi.toFixed(2)}).{" "}
            {impact(worst.spi, totalPV, worst.pv)} Recovery plan should be reviewed immediately.
          </p>
        </div>
      )}
      {best && best.spi >= 0.95 && sorted.length > 1 && (
        <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: "var(--success-light)", border: "1px solid rgba(5,150,105,0.2)" }}>
          <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: "var(--success)" }} />
          <p style={{ fontSize: 12, color: "var(--success)", lineHeight: 1.6 }}>
            <span className="font-bold">{best.contractor}</span> is the top performer with SPI {best.spi.toFixed(2)}.{" "}
            Their approach may offer lessons for underperforming contractors.
          </p>
        </div>
      )}

      <div className="p-6">
        <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 40)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 24, left: 90, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" domain={[0, 1.2]} tickFormatter={(v) => v.toFixed(1)}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="contractor"
              tick={{ fontSize: 10, fill: "var(--text-secondary)" }} width={90} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(30,64,175,0.04)" }} />
            <ReferenceLine x={1} stroke="var(--border-md)" strokeDasharray="4 3" />
            <Bar dataKey="spi" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {chartData.map((entry, i) => <Cell key={i} fill={spiColor(entry.spi)} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full" style={{ fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Rank", "Contractor", "PV", "EV", "SPI", "Impact"].map((h, i) => (
                  <th key={h} className={i === 0 ? "py-2 w-8" : i === 5 ? "py-2 pl-4 text-left" : "py-2"} style={{ textAlign: i > 0 && i < 5 ? "right" : "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md font-bold"
                      style={{ fontSize: 10, ...rankStyle(i + 1) }}>{i + 1}</span>
                  </td>
                  <td className="py-2.5 font-medium" style={{ color: "var(--text-primary)" }}>
                    {row.contractor}
                    {i === sorted.length - 1 && sorted.length > 1 && row.spi < 0.90 && (
                      <span className="ml-2 font-bold rounded px-1.5 py-0.5" style={{ fontSize: 9, background: "var(--danger-light)", color: "var(--danger)" }}>CRITICAL</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right" style={{ color: "var(--text-muted)" }}>{row.pv.toLocaleString()}</td>
                  <td className="py-2.5 text-right" style={{ color: "var(--text-muted)" }}>{row.ev.toLocaleString()}</td>
                  <td className="py-2.5 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg font-bold" style={{ fontSize: 11, ...spiBg(row.spi) }}>
                      {row.spi.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2.5 pl-4 max-w-[160px]" style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {impact(row.spi, totalPV, row.pv)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
