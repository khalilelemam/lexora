import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Lexend } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { QueryProvider } from '@/components/shared/query-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const lexend = Lexend({
  variable: '--font-lexend',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://lexora.page'),
  title: {
    default: 'Lexora — Dyslexia Screening Platform',
    template: '%s | Lexora',
  },
  description:
    'Lexora is an eye-tracking-based dyslexia screening platform. Non-invasive, research-backed tools to help identify reading difficulties through gaze analysis.',
  keywords: [
    'dyslexia',
    'screening',
    'eye tracking',
    'reading assessment',
    'gaze analysis',
    'education',
  ],
  authors: [{ name: 'Lexora Team' }],
  openGraph: {
    title: 'Lexora — Dyslexia Screening Platform',
    description:
      'Non-invasive, research-backed dyslexia screening through eye-tracking technology.',
    type: 'website',
    siteName: 'Lexora',
    locale: 'en_US',
  },
};

export const viewport: Viewport = {
  themeColor: '#51513d',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className="scroll-smooth"
      data-scroll-behavior="smooth"
      lang="en"
      suppressHydrationWarning
    >
      <body className={`${geistSans.variable} ${geistMono.variable} ${lexend.variable} antialiased`}>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
