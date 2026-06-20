'use client';

import { useEffect, useRef } from 'react';
import { DEBUG_GAZE_OVERLAY } from '../lib/debug-config';

/**
 * Real-time gaze visualization overlay.
 *
 * Renders a red circular dot at the predicted gaze position, updated
 * every animation frame. Used for visual verification of where the
 * calibrated model believes the user is looking.
 *
 * Only renders when DEBUG_GAZE_OVERLAY is true.
 */

interface GazeDebugDotProps {
  /** Function that returns the latest predicted gaze position (screen pixels) */
  getPosition: () => { x: number; y: number } | null;
  /** Whether the dot should be actively tracking */
  active: boolean;
}

export function GazeDebugDot({ getPosition, active }: GazeDebugDotProps) {
  const dotRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const getPosRef = useRef(getPosition);

  useEffect(() => {
    getPosRef.current = getPosition;
  }, [getPosition]);

  useEffect(() => {
    if (!DEBUG_GAZE_OVERLAY || !active) {
      if (dotRef.current) dotRef.current.style.display = 'none';
      return;
    }

    const updatePosition = () => {
      const dot = dotRef.current;
      if (!dot) return;

      const pos = getPosRef.current();
      if (pos) {
        dot.style.left = `${pos.x}px`;
        dot.style.top = `${pos.y}px`;
        dot.style.display = 'block';
      } else {
        dot.style.display = 'none';
      }

      rafRef.current = requestAnimationFrame(updatePosition);
    };

    rafRef.current = requestAnimationFrame(updatePosition);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!DEBUG_GAZE_OVERLAY) return null;

  return (
    <div
      ref={dotRef}
      id="gaze-debug-dot"
      style={{
        position: 'fixed',
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: '#4A7C59',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
        boxShadow: '0 0 12px rgba(74, 124, 89, 0.6)',
        display: 'none',
        border: '1px solid rgba(255, 255, 255, 0.8)',
      }}
    />
  );
}
