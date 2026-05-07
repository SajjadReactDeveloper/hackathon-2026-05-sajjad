'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface DailyMessages { day: string; inboundCount: number; outboundCount: number; aiCount: number }
interface Props { data: DailyMessages[] }

export function MessagesChart({ data }: Props) {
  const chartData = data.map((d) => ({
    day: new Date(d.day).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }),
    Inbound: d.inboundCount,
    AI:      d.aiCount,
    Manual:  Math.max(0, d.outboundCount - d.aiCount),
  }));

  const totalIn  = data.reduce((s, d) => s + d.inboundCount, 0);
  const totalAI  = data.reduce((s, d) => s + d.aiCount, 0);
  const aiPct    = totalIn ? Math.round((totalAI / totalIn) * 100) : 0;

  const LEGEND = [
    { color: '#86efac', label: 'Inbound' },
    { color: '#22c55e', label: 'AI Reply' },
    { color: '#60a5fa', label: 'Manual' },
  ];

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Message Volume</p>
          <p className="text-[22px] font-bold text-slate-900 tracking-tight mt-0.5 num">
            {totalIn.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{aiPct}% AI-handled · last 14 days</p>
        </div>
        <div
          className="px-2.5 py-1 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}
        >
          14d
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        {LEGEND.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
            <span className="text-[11px] text-slate-400 font-medium">{label}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={148}>
        <BarChart data={chartData} margin={{ top: 2, right: 2, bottom: 0, left: 0 }} barSize={5} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false} axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false} axisLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              border: 'none', borderRadius: 10, fontSize: 11, background: '#fff',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Bar dataKey="Inbound" fill="#86efac" radius={[3, 3, 0, 0]} />
          <Bar dataKey="AI"      fill="#22c55e" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Manual"  fill="#60a5fa" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
