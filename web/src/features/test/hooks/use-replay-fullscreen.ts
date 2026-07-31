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
  // Whether a replay currently wants fullscreen. Tracked separately from
  // ownership because `requestFullscreen()` resolves asynchronously and the
  // replay can be closed while that request is still in flight.
  const wantsFullscreenRef = useRef(false);
  // Whether we are the ones who put the browser into fullscreen. The test flow
  // may already be fullscreen for its own reasons; that is not ours to undo.
  const ownsFullscreenRef = useRef(false);

  const release = useCallback(() => {
    if (!ownsFullscreenRef.current) {
      return;
    }

    ownsFullscreenRef.current = false;

    if (document.fullscreenElement && document.exitFullscreen) {
      void document.exitFullscreen().catch(() => {});
    }
  }, []);

  const enter = useCallback(() => {
    if (document.fullscreenElement || !document.documentElement.requestFullscreen) {
      return;
    }

    wantsFullscreenRef.current = true;

    void document.documentElement
      .requestFullscreen()
      .then(() => {
        ownsFullscreenRef.current = true;

        // The replay was closed while the request was still pending, so the
        // close had nothing to undo. Leave fullscreen now instead of stranding
        // the page there until the user presses Esc.
        if (!wantsFullscreenRef.current) {
          release();
        }
      })
      .catch(() => {
        ownsFullscreenRef.current = false;
      });
  }, [release]);

  const exit = useCallback(() => {
    wantsFullscreenRef.current = false;
    release();
  }, [release]);

  // Release fullscreen if the trigger unmounts while a replay is still open.
  useEffect(
    () => () => {
      wantsFullscreenRef.current = false;

      if (ownsFullscreenRef.current && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    },
    [],
  );

  return { enter, exit };
}
