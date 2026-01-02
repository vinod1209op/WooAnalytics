import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { PageShell } from '@/components/layout/page-shell';
import { StoreProvider } from '@/providers/store-provider';
import { ThemeProvider } from 'next-themes';
import { cn } from '@/lib/utils';
import { ChatWidget } from '@/components/chat/chat-widget';

export const metadata: Metadata = {
  title: 'WooCommerce Analytics Dashboard',
  description: 'Analytics for WooCommerce stores',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-slate-50 text-slate-900 antialiased font-sans'
        )}
      >
        
        <ThemeProvider 
          attribute="class"
          defaultTheme="light"
          enableSystem>
            <StoreProvider>
              <Navbar />
              <PageShell>{children}</PageShell>
              <ChatWidget />
            </StoreProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}
