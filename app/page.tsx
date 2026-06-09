'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { NetWorthCard } from '@/components/dashboard/net-worth-card';
import { NetWorthChart } from '@/components/dashboard/net-worth-chart';
import { AllocationChart } from '@/components/dashboard/allocation-chart';
import { AccountsList } from '@/components/dashboard/accounts-list';
import { HoldingsTable } from '@/components/dashboard/holdings-table';
import { Recommendations } from '@/components/dashboard/recommendations';
import { QuickStats } from '@/components/dashboard/quick-stats';
import { ActivityFeed } from '@/components/dashboard/activity-feed';

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 md:p-6 space-y-6">

          {/* Row 1: Net Worth hero + Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <NetWorthCard />
            <div className="lg:col-span-3">
              <QuickStats />
            </div>
          </div>

          {/* Row 2: Net Worth Chart spanning full */}
          <NetWorthChart />

          {/* Row 3: Allocation + Accounts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <AllocationChart />
            <div className="lg:col-span-2">
              <AccountsList />
            </div>
          </div>

          {/* Row 4: Holdings table — full width */}
          <HoldingsTable />

          {/* Row 5: Recommendations + Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Recommendations />
            </div>
            <ActivityFeed />
          </div>

        </main>
      </div>
    </div>
  );
}
