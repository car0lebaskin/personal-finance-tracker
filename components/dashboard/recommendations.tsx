'use client';

import { recommendations } from '@/lib/data';
import { AlertTriangle, TrendingDown, Lightbulb, Shuffle, ShieldAlert, DollarSign, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const typeConfig = {
  rebalance: { icon: Shuffle, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  tax: { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  fee: { icon: TrendingDown, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  risk: { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  opportunity: { icon: Lightbulb, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
};

const priorityBadge = {
  high: 'bg-red-500/15 text-red-400',
  medium: 'bg-amber-500/15 text-amber-400',
  low: 'bg-slate-500/15 text-slate-400',
};

export function Recommendations() {
  const [expanded, setExpanded] = useState<string | null>('r1');

  const high = recommendations.filter(r => r.priority === 'high');
  const rest = recommendations.filter(r => r.priority !== 'high');

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Portfolio Recommendations</h3>
          <p className="text-xs text-muted-foreground mt-0.5">AI-powered insights to optimize your wealth</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          {high.length} High Priority
        </div>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => {
          const config = typeConfig[rec.type];
          const Icon = config.icon;
          const open = expanded === rec.id;

          return (
            <div
              key={rec.id}
              className={cn(
                'rounded-xl border transition-all duration-200 overflow-hidden',
                open ? `${config.border} ${config.bg}` : 'border-border/40 hover:border-border/70 bg-white/[0.02] hover:bg-white/[0.04]'
              )}
            >
              <button
                onClick={() => setExpanded(open ? null : rec.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', open ? `${config.bg}` : 'bg-secondary')}>
                  <Icon className={cn('w-4 h-4', open ? config.color : 'text-muted-foreground')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-foreground truncate">{rec.title}</span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0', priorityBadge[rec.priority])}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{rec.description}</p>
                </div>
                <ChevronRight className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-90')} />
              </button>

              {open && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 rounded-lg bg-black/20 p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Potential Impact</p>
                      <p className="text-sm font-semibold text-foreground">{rec.impact}</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-black/20 p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Suggested Action</p>
                      <p className="text-sm text-foreground">{rec.action}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
