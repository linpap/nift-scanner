import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'STOCK Scanner - NSE F&O Stock Scanner',
  description: 'Real-time NSE F&O stock scanner for swing trading and momentum strategies',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
