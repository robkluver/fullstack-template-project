import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/layout';
import { QueryProvider } from '@/lib/query-client';
import { AuthProvider } from '@/lib/auth';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';

export const metadata: Metadata = {
  title: 'Nexus',
  description: 'One place. Zero friction. Pure flow.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              <AuthenticatedLayout>{children}</AuthenticatedLayout>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
