'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Theme provider wrapper — applies the theme class to <html>.
 *
 * Lexora ships light only. The screening test needs light mode for camera
 * contrast, and the rest of the app is built on the same fixed brand palette,
 * so there is no dark variant to switch to and no control that offers one.
 *
 * `forcedTheme` rather than `defaultTheme` on purpose: next-themes reads
 * `localStorage.theme` ahead of any default, so a value stored back when the
 * theme toggle still existed would keep applying `.dark` with no way left to
 * clear it. Forcing the theme ignores stored values entirely.
 *
 * Drop `forcedTheme` if a real dark palette and a way to pick it ever land.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      forcedTheme="light"
    >
      {children}
    </NextThemesProvider>
  );
}
