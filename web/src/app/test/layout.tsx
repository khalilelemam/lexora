'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Test layout — forces light mode because the camera requires good
 * contrast for face/iris detection. Users are informed on the landing
 * page that the test needs light mode.
 */
export default function TestLayout({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
