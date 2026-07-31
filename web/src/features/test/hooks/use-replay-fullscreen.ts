'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Fullscreen handling shared by every gaze replay entry point.
 *
 * A replay only lines up with the recorded gaze when it renders in the same
 * viewport the reading task used, and the reading task always runs fullscreen.
 * Results, history, and admin therefore all push the browser back into
 * fullscreen before showing a replay.
 *
 * `enter()` must be called from a user gesture — the browser rejects
 * `requestFullscreen()` outside one.
 */
export function useReplayFullscreen() {
  // Only leave fullscreen again if *this* replay is what entered it; the test
  // flow may already be fullscreen for its own reasons.
  const ownsFullscreenRef = useRef(false);

  const enter = useCallback(() => {
    if (document.fullscreenElement || !document.documentElement.requestFullscreen) {
      return;
    }

    void document.documentElement
      .requestFullscreen()
      .then(() => {
        ownsFullscreenRef.current = true;
      })
      .catch(() => {
        ownsFullscreenRef.current = false;
      });
  }, []);

  const exit = useCallback(() => {
    if (!ownsFullscreenRef.current) {
      return;
    }

    ownsFullscreenRef.current = false;

    if (document.fullscreenElement && document.exitFullscreen) {
      void document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Release fullscreen if the trigger unmounts while a replay is still open.
  useEffect(
    () => () => {
      if (ownsFullscreenRef.current && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    },
    [],
  );

  return { enter, exit };
}
