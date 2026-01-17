import Navigation from '@/components/Navigation';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import GlobalChartModal from '@/components/GlobalChartModal';
import { DataSourceProvider } from '@/contexts/DataSourceContext';
import { ChartModalProvider } from '@/contexts/ChartModalContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataSourceProvider>
      <ChartModalProvider>
        <div className="min-h-screen bg-gray-950 flex flex-col">
          <Navigation />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 overflow-x-hidden">{children}</main>
          </div>
          <Footer />
        </div>
        <GlobalChartModal />
      </ChartModalProvider>
    </DataSourceProvider>
  );
}
