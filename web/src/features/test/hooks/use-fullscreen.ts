'use client';

import { useState, useCallback, useEffect } from 'react';

/**
 * Wraps the browser Fullscreen API for immersive test experiences.
 *
 * Hides Chrome tabs, Windows taskbar, etc. — only the website is visible.
 * Handles the `fullscreenchange` event so `isFullscreen` stays in sync,
 * and auto-exits fullscreen on component unmount.
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen request denied — non-critical, continue without it
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Already exited or not supported
    }
  }, []);

  // Sync state with browser fullscreen changes (user pressing Esc, etc.)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Exit fullscreen on unmount (navigating away from the test page)
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  return { isFullscreen, enterFullscreen, exitFullscreen };
}
