import { Suspense } from 'react';
import DashboardSidebar from '@/components/DashboardSidebar';
import SubscriptionSuccessBanner from '@/components/SubscriptionSuccessBanner';
import PlanBootstrap from '@/components/PlanBootstrap';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-layout">
      <DashboardSidebar />
      <main className="dashboard-main">
        {children}
      </main>
      <PlanBootstrap />
      {/* Suspense required because SubscriptionSuccessBanner uses useSearchParams */}
      <Suspense>
        <SubscriptionSuccessBanner />
      </Suspense>
    </div>
  );
}
