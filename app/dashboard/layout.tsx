import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { DataSourceProvider } from '@/contexts/DataSourceContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataSourceProvider>
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <Navigation />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </DataSourceProvider>
  );
}
