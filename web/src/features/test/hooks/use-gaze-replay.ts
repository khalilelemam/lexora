'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { GazeFeature } from '../types';

const DEFAULT_SPEED_OPTIONS = [0.5, 1, 2, 4] as const;

export type ReplaySpeed = (typeof DEFAULT_SPEED_OPTIONS)[number];

interface UseGazeReplayOptions {
  /** ML fixation features (normalized coords) */
  features: GazeFeature[];
  /** Whether the replay overlay is currently visible */
  active: boolean;
}

/**
 * Encapsulates the animation loop for replaying ML-analyzed fixation data.
 *
 * Returns play/pause/reset controls, the current trail of visited fixation
 * indices, progress %, and a speed selector.
 */
export function useGazeReplay({ features, active }: UseGazeReplayOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [trail, setTrail] = useState<number[]>([]);
  const rafRef = useRef(0);
  const startTimeRef = useRef(0);

  // Cumulative timeline offsets (ms)
  const timeline = useMemo(() => {
    return features.reduce(
      (state, feature) => ({
        elapsed: state.elapsed + feature.durationMs,
        points: [...state.points, state.elapsed],
      }),
      { elapsed: 0, points: [] as number[] },
    ).points;
  }, [features]);

  const totalDuration = useMemo(
    () =>
      timeline.length > 0
        ? timeline[timeline.length - 1] + features[features.length - 1].durationMs
        : 0,
    [timeline, features],
  );

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !active) return;

    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) * speed;
      if (elapsed >= totalDuration) {
        setIsPlaying(false);
        setCurrentIndex(features.length - 1);
        setTrail(features.map((_, i) => i));
        return;
      }

      let idx = 0;
      for (let i = timeline.length - 1; i >= 0; i--) {
        if (elapsed >= timeline[i]) {
          idx = i;
          break;
        }
      }

      setCurrentIndex(idx);
      setTrail((prev) => {
        if (prev.length === 0 || prev[prev.length - 1] !== idx) return [...prev, idx];
        return prev;
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, speed, totalDuration, features, timeline, active]);

  const maxDuration = useMemo(() => Math.max(...features.map((f) => f.durationMs), 1), [features]);

  const getBubbleSize = useCallback(
    (durationMs: number) => 10 + (durationMs / maxDuration) * 26,
    [maxDuration],
  );

  const play = useCallback(() => {
    if (currentIndex >= features.length - 1) {
      setCurrentIndex(-1);
      setTrail([]);
    }
    startTimeRef.current = performance.now();
    setIsPlaying(true);
  }, [currentIndex, features.length]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
    setCurrentIndex(-1);
    setTrail([]);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const progress =
    features.length > 0 && currentIndex >= 0
      ? Math.round(((currentIndex + 1) / features.length) * 100)
      : 0;

  return {
    isPlaying,
    currentIndex,
    trail,
    progress,
    speed,
    setSpeed,
    getBubbleSize,
    play,
    pause,
    reset,
    togglePlayPause,
    speedOptions: DEFAULT_SPEED_OPTIONS,
  };
}
