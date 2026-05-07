'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface DailyRevenue { day: string; revenueCents: number; orderCount: number }
interface Props { data: DailyRevenue[] }

function fmt(cents: number) {
  return `PKR ${(cents / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export function RevenueChart({ data }: Props) {
  const chartData = data.map((d) => ({
    day: new Date(d.day).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }),
    revenue: d.revenueCents / 100,
    orders: d.orderCount,
  }));

  const total  = data.reduce((s, d) => s + d.revenueCents, 0);
  const orders = data.reduce((s, d) => s + d.orderCount, 0);

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Revenue</p>
          <p className="text-[22px] font-bold text-slate-900 tracking-tight mt-0.5 num">{fmt(total)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{orders} orders · last 30 days</p>
        </div>
        <div
          className="px-2.5 py-1 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}
        >
          30d
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData} margin={{ top: 4, right: 2, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            width={38}
          />
          <Tooltip
            formatter={(v: unknown) => [fmt((v as number) * 100), 'Revenue']}
            labelStyle={{ color: '#0f172a', fontSize: 11, fontWeight: 700 }}
            contentStyle={{
              border: 'none',
              borderRadius: 10,
              fontSize: 11,
              background: '#fff',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
            cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
          />
          <Area
            type="monotone" dataKey="revenue"
            stroke="#22c55e" strokeWidth={2.5}
            fill="url(#rev-fill)"
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
