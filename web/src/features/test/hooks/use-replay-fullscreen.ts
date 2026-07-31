'use client';

import { useCallback, useEffect, useRef } from 'react';

interface ReplayFullscreenState {
  /**
   * Whether a replay currently wants fullscreen. Tracked apart from the browser
   * state because both fullscreen transitions are asynchronous and a replay can
   * be opened or closed while one is still in flight.
   */
  wants: boolean;
  /**
   * Whether we are the ones who put the browser into fullscreen. The test flow
   * may already be fullscreen for its own reasons; that is not ours to undo.
   */
  owns: boolean;
  /** Whether a request or an exit is still settling. */
  isTransitioning: boolean;
}

/**
 * Brings the browser in line with the current intent.
 *
 * Runs on every open, every close, and after each transition settles. Driving
 * both directions from one reconciliation is what makes a rapid
 * close-then-reopen correct: intent recorded mid-transition is applied once the
 * in-flight request or exit finishes, instead of being dropped.
 */
function syncFullscreen(state: ReplayFullscreenState) {
  // A settle handler will call back in; acting now would interleave a second
  // transition with the one already running.
  if (state.isTransitioning) {
    return;
  }

  const isFullscreen = Boolean(document.fullscreenElement);

  if (state.wants && !isFullscreen) {
    if (!document.documentElement.requestFullscreen) {
      return;
    }

    state.isTransitioning = true;

    void document.documentElement
      .requestFullscreen()
      .then(() => {
        state.owns = true;
      })
      .catch(() => {
        // Denied — usually a lost user gesture. Drop the intent rather than
        // retry, so reconciliation cannot spin on a request that will never
        // succeed.
        state.owns = false;
        state.wants = false;
      })
      .finally(() => {
        state.isTransitioning = false;
        syncFullscreen(state);
      });

    return;
  }

  if (!state.wants && state.owns && isFullscreen) {
    state.owns = false;
    state.isTransitioning = true;

    void document
      .exitFullscreen()
      .catch(() => {})
      .finally(() => {
        state.isTransitioning = false;
        syncFullscreen(state);
      });
  }
}

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
  const stateRef = useRef<ReplayFullscreenState>({
    wants: false,
    owns: false,
    isTransitioning: false,
  });

  const enter = useCallback(() => {
    stateRef.current.wants = true;
    syncFullscreen(stateRef.current);
  }, []);

  const exit = useCallback(() => {
    stateRef.current.wants = false;
    syncFullscreen(stateRef.current);
  }, []);

  // Release fullscreen if the trigger unmounts while a replay is still open.
  // The state outlives the component, so a transition in flight still settles
  // into the right place.
  useEffect(() => {
    const state = stateRef.current;

    return () => {
      state.wants = false;
      syncFullscreen(state);
    };
  }, []);

  return { enter, exit };
}
