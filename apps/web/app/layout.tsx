import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { PageShell } from '@/components/layout/page-shell';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WooCommerce Analytics Dashboard',
  description: 'Analytics for WooCommerce stores',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-slate-50 text-slate-900 antialiased',
          inter.className
        )}
      >
        
        <ThemeProvider 
          attribute="class"
          defaultTheme="light"
          enableSystem>
            <Navbar />
            
            <PageShell>{children}</PageShell>

          </ThemeProvider>
      </body>
    </html>
  );
}