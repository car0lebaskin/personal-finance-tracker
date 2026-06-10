'use client';

import AppLock from '@/components/AppLock';
import VaultDashboard from '@/components/VaultDashboard';

export default function Page() {
  return (
    <AppLock>
      <VaultDashboard />
    </AppLock>
  );
}
