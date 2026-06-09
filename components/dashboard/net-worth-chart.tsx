'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { monthlyNetWorthExtended } from '@/lib/data';
import { useState } from 'react';

const ranges = ['6M', '1Y', 'YTD', 'All'];

export function NetWorthChart() {
  const [range, setRange] = useState('1Y');

  const data = range === '6M'
    ? monthlyNetWorthExtended.slice(-6)
    : monthlyNetWorthExtended;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 col-span-2 lg:col-span-3">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Net Worth Trend</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Track your wealth over time</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-secondary/60">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                range === r
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(220 15% 18%)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(220 18% 11%)',
                border: '1px solid hsl(220 15% 20%)',
                borderRadius: 10,
                fontSize: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}
              formatter={(v: number) => [`$${v.toLocaleString()}`, 'Net Worth']}
              labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#nwGrad)"
              dot={false}
              activeDot={{ r: 5, fill: '#3b82f6', stroke: '#1e3a5f', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
