import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Simple Finance — Personal Finance Tracker',
  description: 'Track your net worth, manage assets, liabilities, transactions, and budgets with a premium dark dashboard.',
  keywords: ['finance', 'personal finance', 'budget tracker', 'expense manager', 'net worth'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen antialiased bg-background text-foreground`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
