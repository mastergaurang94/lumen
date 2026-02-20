import type { Metadata, Viewport } from 'next';
import { Lato, Fraunces } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { VaultProvider } from '@/components/vault-provider';
import './globals.css';

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-lato',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://mylumen.ai'),
  title: 'Lumen',
  description: 'A companion for the journey — weekly conversations that restore self-trust',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lato.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <VaultProvider>{children}</VaultProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
