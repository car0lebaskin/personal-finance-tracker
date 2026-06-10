import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Vault — Personal Finance Dashboard',
  description: 'Track your net worth, investments, retirement goals, and portfolio insights.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/vault-icon.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/vault-icon.svg', sizes: '512x512', type: 'image/svg+xml' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Vault',
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
