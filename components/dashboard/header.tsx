'use client';

import { Bell, Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function Header() {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="md:hidden w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm">
            V
          </div>
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search holdings, accounts..."
              className="pl-10 w-60 lg:w-80 bg-white/5 border-border/60 focus-visible:ring-1 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground border border-border/60 rounded-lg px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live · Jun 9, 2026
          </span>
          <button className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="relative p-2 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-xs font-bold text-white">
            JD
          </div>
        </div>
      </div>
    </header>
  );
}
