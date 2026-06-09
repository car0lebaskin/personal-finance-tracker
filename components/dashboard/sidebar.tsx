'use client';

import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  PieChart,
  Lightbulb,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: Wallet, label: 'Portfolio', active: false },
  { icon: PieChart, label: 'Net Worth', active: false },
  { icon: ArrowRightLeft, label: 'Activity', active: false },
  { icon: Lightbulb, label: 'Recommendations', active: false },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 border-r border-border/60 transition-all duration-300 shrink-0',
        collapsed ? 'w-[64px]' : 'w-[220px]'
      )}
      style={{ background: 'hsl(220 20% 7%)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border/60">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm shrink-0">
          V
        </div>
        {!collapsed && (
          <div>
            <span className="font-semibold text-foreground tracking-tight text-sm">Vault</span>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Finance Dashboard</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              item.active
                ? 'bg-primary/12 text-primary'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="py-4 px-3 border-t border-border/60 space-y-0.5">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors">
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
