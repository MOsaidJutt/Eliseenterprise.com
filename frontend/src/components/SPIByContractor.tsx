"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { SPIContractor } from "@/lib/api";

function spiColor(spi: number) {
  if (spi >= 0.95) return "#10B981";
  if (spi >= 0.80) return "#F59E0B";
  return "#EF4444";
}

function spiBg(spi: number) {
  if (spi >= 0.95) return "bg-emerald-50 text-emerald-700";
  if (spi >= 0.80) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-600";
}

function rankBadge(rank: number) {
  if (rank === 1) return "bg-emerald-100 text-emerald-700";
  if (rank === 2) return "bg-amber-50 text-amber-600";
  return "bg-red-50 text-red-600";
}

function impact(spi: number, totalPV: number, pv: number): string {
  const share = totalPV > 0 ? ((pv / totalPV) * 100).toFixed(0) : "0";
  if (spi >= 0.95) return `On track · ${share}% of total planned work`;
  if (spi >= 0.85) return `Minor slippage · ${share}% planned work at risk`;
  if (spi >= 0.75) return `Significant delay · ${share}% of programme behind plan`;
  return `Critical underperformer · ${share}% of programme in jeopardy`;
}

export default function SPIByContractor({ data }: { data: SPIContractor[] }) {
  const sorted = [...data].sort((a, b) => b.spi - a.spi); // best to worst
  const chartData = [...data].sort((a, b) => a.spi - b.spi); // chart: worst at bottom
  const totalPV = data.reduce((s, d) => s + d.pv, 0);
  const worst = sorted[sorted.length - 1];
  const best = sorted[0];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: SPIContractor }> }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const rank = sorted.findIndex(r => r.contractor === d.contractor) + 1;
    return (
      <div className="bg-white border border-slate-200 shadow-lg rounded-xl p-3 text-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${rankBadge(rank)}`}>#{rank}</span>
          <p className="font-bold text-slate-800">{d.contractor}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between gap-6"><span className="text-slate-400">PV (planned)</span><span className="font-semibold">{d.pv.toLocaleString()}</span></div>
          <div className="flex justify-between gap-6"><span className="text-slate-400">EV (earned)</span><span className="font-semibold">{d.ev.toLocaleString()}</span></div>
          <div className="flex justify-between gap-6 pt-1 border-t border-slate-100">
            <span className="text-slate-500 font-semibold">SPI</span>
            <span className={`font-bold ${d.spi >= 0.95 ? "text-emerald-600" : d.spi >= 0.80 ? "text-amber-600" : "text-red-600"}`}>{d.spi.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Contractor Performance Ranking</h3>
          <p className="text-xs text-slate-400 mt-0.5">Schedule Performance Index — ranked best to worst</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />≥ 0.95</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />0.80–0.95</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{"< 0.80"}</span>
        </div>
      </div>

      {/* Impact callout */}
      {worst && worst.spi < 0.90 && (
        <div className="mx-6 mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1" />
          <p className="text-xs text-red-700 leading-relaxed">
            <span className="font-bold">{worst.contractor}</span> is the weakest performer (SPI {worst.spi.toFixed(2)}).{" "}
            {impact(worst.spi, totalPV, worst.pv)} Recovery plan should be reviewed immediately.
          </p>
        </div>
      )}
      {best && best.spi >= 0.95 && sorted.length > 1 && (
        <div className="mx-6 mt-4 flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
          <p className="text-xs text-emerald-700 leading-relaxed">
            <span className="font-bold">{best.contractor}</span> is the top performer with SPI {best.spi.toFixed(2)}.{" "}
            Their approach and resourcing model may offer lessons for underperforming contractors.
          </p>
        </div>
      )}

      <div className="p-6">
        <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 40)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 24, left: 90, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis type="number" domain={[0, 1.2]} tickFormatter={(v) => v.toFixed(1)} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="contractor" tick={{ fontSize: 10, fill: "#475569" }} width={90} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
            <ReferenceLine x={1} stroke="#CBD5E1" strokeDasharray="4 3" />
            <Bar dataKey="spi" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {chartData.map((entry, i) => <Cell key={i} fill={spiColor(entry.spi)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Ranked table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-slate-400 font-semibold w-8">Rank</th>
                <th className="text-left py-2 text-slate-400 font-semibold">Contractor</th>
                <th className="text-right py-2 text-slate-400 font-semibold">PV</th>
                <th className="text-right py-2 text-slate-400 font-semibold">EV</th>
                <th className="text-right py-2 text-slate-400 font-semibold">SPI</th>
                <th className="text-left py-2 text-slate-400 font-semibold pl-4">Impact</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2.5">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold ${rankBadge(i + 1)}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-700 font-medium">
                    {row.contractor}
                    {i === sorted.length - 1 && sorted.length > 1 && row.spi < 0.90 && (
                      <span className="ml-2 text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">CRITICAL</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-slate-500">{row.pv.toLocaleString()}</td>
                  <td className="py-2.5 text-right text-slate-500">{row.ev.toLocaleString()}</td>
                  <td className="py-2.5 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg font-bold text-[11px] ${spiBg(row.spi)}`}>
                      {row.spi.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2.5 pl-4 text-slate-400 text-[10px] max-w-[160px]">
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
