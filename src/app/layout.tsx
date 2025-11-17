import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FortifyMIS Portal - Food Fortification Management System',
  description:
    'Comprehensive digital platform for food fortification operations, compliance monitoring, and institutional procurement.',
  keywords: [
    'food fortification',
    'mill management',
    'quality control',
    'compliance',
    'institutional procurement',
    'FWGA',
  ],
  authors: [{ name: 'FortifyMIS Team' }],
  openGraph: {
    type: 'website',
    title: 'FortifyMIS Portal',
    description: 'Digital platform for food fortification operations',
    siteName: 'FortifyMIS',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
