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
    default: 'ليكسورا — منصة تقييم وتتبع مهارات القراءة بالذكاء الاصطناعي',
    template: '%s | ليكسورا Lexora',
  },
  description:
    'ليكسورا هي منصة علمية متقدمة لتتبع حركة العين أثناء القراءة باللغة العربية، لدعم الأطفال وتطوير نماذج ذكاء اصطناعي تفهم خصوصية لغتنا.',
  keywords: [
    'ليكسورا',
    'قائمة الانتظار',
    'تتبع العين',
    'صعوبات القراءة',
    'الديسلكسيا',
    'تقييم القراءة للأطفال',
    'قراءة اللغة العربية',
  ],
  authors: [{ name: 'فريق ليكسورا Lexora' }],
  openGraph: {
    title: 'ليكسورا — منصة تقييم وتتبع مهارات القراءة',
    description:
      'شارك معنا في بناء أول قاعدة بيانات عربية لتتبع حركة العين أثناء القراءة.',
    type: 'website',
    siteName: 'ليكسورا Lexora',
    locale: 'ar_SA',
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
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lexend.variable} antialiased`}
      >
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
