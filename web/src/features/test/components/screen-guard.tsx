'use client';

import { useState, useEffect } from 'react';
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
  const [tooSmall, setTooSmall] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const w = window.screen.width;
    const h = window.screen.height;
    setTooSmall(w < MIN_WIDTH || h < MIN_HEIGHT);
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (tooSmall) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <MonitorSmartphone className="h-16 w-16 text-muted-foreground" />
          <div>
            <h2 className="text-2xl font-semibold">Screen Too Small</h2>
            <p className="mt-2 text-muted-foreground">
              Eye-tracking tests require a screen of at least {MIN_WIDTH}×{MIN_HEIGHT} pixels
              for accurate results. Please use a laptop or desktop monitor.
            </p>
          </div>
          <Alert>
            <AlertDescription>
              Your screen: {typeof window !== 'undefined' ? `${window.screen.width}×${window.screen.height}` : 'unknown'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
