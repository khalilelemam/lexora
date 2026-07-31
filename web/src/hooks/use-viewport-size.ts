'use client';

import { useEffect, useState } from 'react';

export interface ViewportSize {
  width: number;
  height: number;
}

/** Used for server rendering and before the first client measurement. */
const FALLBACK_VIEWPORT: ViewportSize = { width: 1920, height: 1080 };

function readViewport(): ViewportSize {
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Viewport size that stays in sync with resizes and fullscreen transitions.
 *
 * Gaze overlays derive their pixel geometry from the viewport, and they are
 * opened *before* the browser finishes entering fullscreen. Reading
 * `window.innerWidth` during render therefore captures the windowed viewport
 * and never corrects itself, which misplaces every fixation bubble.
 */
export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(FALLBACK_VIEWPORT);

  useEffect(() => {
    const update = () => {
      setSize((previous) => {
        const next = readViewport();
        return previous.width === next.width && previous.height === next.height ? previous : next;
      });
    };

    update();

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    document.addEventListener('fullscreenchange', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('fullscreenchange', update);
    };
  }, []);

  return size;
}
