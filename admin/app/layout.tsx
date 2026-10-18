import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';

import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const playfair = Playfair_Display({ variable: '--font-playfair', subsets: ['latin'], weight: ['600', '700'] });

export const metadata: Metadata = {
  title: 'HabeshaMatch Admin',
  description: 'Moderation and insights for HabeshaMatch',
  robots: { index: false, follow: false }, // keep the admin panel out of search engines
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
