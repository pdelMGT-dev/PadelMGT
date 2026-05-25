import DashboardSidebar from '@/components/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-layout">
      <DashboardSidebar />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
