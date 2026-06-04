import { Suspense } from 'react';
import DashboardSidebar from '@/components/DashboardSidebar';
import SubscriptionSuccessBanner from '@/components/SubscriptionSuccessBanner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-layout">
      <DashboardSidebar />
      <main className="dashboard-main">
        {children}
      </main>
      {/* Suspense required because SubscriptionSuccessBanner uses useSearchParams */}
      <Suspense>
        <SubscriptionSuccessBanner />
      </Suspense>
    </div>
  );
}
