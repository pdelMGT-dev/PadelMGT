import { Suspense } from 'react';
import DashboardSidebar from '@/components/DashboardSidebar';
import SubscriptionSuccessBanner from '@/components/SubscriptionSuccessBanner';
import PlanBootstrap from '@/components/PlanBootstrap';
import NotificationBell from '@/components/NotificationBell';
import PlayerMobileNav from '@/components/mobile/PlayerMobileNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-layout">
      <DashboardSidebar />
      <main className="dashboard-main">
        {children}
      </main>
      <NotificationBell />
      {/* Blue Spectrum mobile shell — renders (and takes over nav) only for the
          player role on phones / tablet-portrait; a no-op everywhere else. */}
      <PlayerMobileNav />
      <PlanBootstrap />
      {/* Suspense required because SubscriptionSuccessBanner uses useSearchParams */}
      <Suspense>
        <SubscriptionSuccessBanner />
      </Suspense>
    </div>
  );
}
