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

export default function SPIByContractor({ data }: { data: SPIContractor[] }) {
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: SPIContractor }> }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 shadow-lg rounded-xl p-3 text-xs">
        <p className="font-bold text-slate-800 mb-2">{d.contractor}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-6">
            <span className="text-slate-400">PV (planned)</span>
            <span className="font-semibold">{d.pv.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-slate-400">EV (earned)</span>
            <span className="font-semibold">{d.ev.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-6 pt-1 border-t border-slate-100">
            <span className="text-slate-500 font-semibold">SPI</span>
            <span className={`font-bold ${d.spi >= 0.95 ? "text-emerald-600" : d.spi >= 0.80 ? "text-amber-600" : "text-red-600"}`}>
              {d.spi.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">SPI by Contractor</h3>
          <p className="text-xs text-slate-400 mt-0.5">Schedule Performance Index — target ≥ 1.00</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />≥ 0.95</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />0.80–0.95</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{"< 0.80"}</span>
        </div>
      </div>

      <div className="p-6">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 90, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 1.2]}
              tickFormatter={(v) => v.toFixed(1)}
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="contractor"
              tick={{ fontSize: 10, fill: "#475569" }}
              width={90}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
            <ReferenceLine x={1} stroke="#CBD5E1" strokeDasharray="4 3" />
            <Bar dataKey="spi" name="SPI" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {data.map((entry, i) => (
                <Cell key={i} fill={spiColor(entry.spi)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-slate-400 font-semibold">Contractor</th>
                <th className="text-right py-2 text-slate-400 font-semibold">PV</th>
                <th className="text-right py-2 text-slate-400 font-semibold">EV</th>
                <th className="text-right py-2 text-slate-400 font-semibold">SPI</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2 text-slate-700 font-medium">{row.contractor}</td>
                  <td className="py-2 text-right text-slate-500">{row.pv.toLocaleString()}</td>
                  <td className="py-2 text-right text-slate-500">{row.ev.toLocaleString()}</td>
                  <td className="py-2 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg font-bold text-[11px] ${spiBg(row.spi)}`}>
                      {row.spi.toFixed(2)}
                    </span>
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
