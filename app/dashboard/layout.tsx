import Navigation from '@/components/Navigation';
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
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <GlobalChartModal />
      </ChartModalProvider>
    </DataSourceProvider>
  );
}
