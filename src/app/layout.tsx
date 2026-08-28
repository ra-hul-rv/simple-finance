import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Simple Finance — Personal Finance Tracker',
  description: 'A premium personal finance dashboard to track net worth, manage accounts, budgets, and transactions.',
  keywords: ['finance', 'personal finance', 'budget tracker', 'expense manager', 'net worth'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body className="font-sans min-h-screen antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
