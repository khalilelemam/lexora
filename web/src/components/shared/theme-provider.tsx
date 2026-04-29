'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Theme provider wrapper — applies dark/light class to <html>.
 *
 * Landing and non-camera pages default to dark mode.
 * Test pages (where camera is active) force light mode for optimal
 * face detection contrast.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
