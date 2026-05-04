'use client';

import { useState } from 'react';
import { MonitorSmartphone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/** Minimum screen dimensions for reliable gaze tracking (pixels) */
const MIN_WIDTH = 1024;
const MIN_HEIGHT = 600;

interface ScreenGuardProps {
  children: React.ReactNode;
}

/**
 * Prevents the test from running on screens that are too small for
 * meaningful gaze tracking. Checks `screen.width` and `screen.height`
 * (physical screen, not viewport) so resize doesn't flicker.
 */
export function ScreenGuard({ children }: ScreenGuardProps) {
  const [screenInfo] = useState(() => {
    if (typeof window === 'undefined') return null;

    const w = window.screen.width;
    const h = window.screen.height;

    return {
      width: w,
      height: h,
      tooSmall: w < MIN_WIDTH || h < MIN_HEIGHT,
    };
  });

  if (!screenInfo) return null;

  if (screenInfo.tooSmall) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <MonitorSmartphone className="text-muted-foreground h-16 w-16" />
          <div>
            <h2 className="text-2xl font-semibold">Screen Too Small</h2>
            <p className="text-muted-foreground mt-2">
              Eye-tracking tests require a screen of at least {MIN_WIDTH}×{MIN_HEIGHT} pixels for
              accurate results. Please use a laptop or desktop monitor.
            </p>
          </div>
          <Alert>
            <AlertDescription>
              Your screen: {`${screenInfo.width}×${screenInfo.height}`}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
