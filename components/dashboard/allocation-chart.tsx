'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { allocationData, holdings, formatCurrency } from '@/lib/data';

export function AllocationChart() {
  const totalPortfolio = holdings.reduce((s, h) => s + h.value, 0);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-1">Asset Allocation</h3>
      <p className="text-xs text-muted-foreground mb-5">
        Investable portfolio · {formatCurrency(totalPortfolio, true)}
      </p>

      <div className="flex items-center gap-4">
        <div className="relative w-[140px] h-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={68}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {allocationData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(220 18% 11%)',
                  border: '1px solid hsl(220 15% 20%)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v}%`]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2">
          {allocationData.map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
              <span className="text-xs text-muted-foreground flex-1 truncate">{s.name}</span>
              <span className="text-xs font-semibold text-foreground tabular-nums">{s.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
