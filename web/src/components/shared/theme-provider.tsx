'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { usePathname } from 'next/navigation';

/**
 * Theme provider wrapper — applies dark/light class to <html>.
 *
 * Test pages (where camera is active) force light mode for optimal
 * face detection contrast using the forcedTheme prop.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTestPage = pathname?.startsWith('/test');

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      forcedTheme={isTestPage ? 'light' : undefined}
    >
      {children}
    </NextThemesProvider>
  );
}
