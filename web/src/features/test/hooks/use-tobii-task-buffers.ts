import { useCallback, useRef, useState } from 'react';
import type { TobiiGazePoint } from '../types';

type TobiiTaskKey = 'syllables' | 'pseudo-words' | 'meaningful-text';

const INITIAL_COUNTS: Record<TobiiTaskKey, number> = {
  syllables: 0,
  'pseudo-words': 0,
  'meaningful-text': 0,
};

/**
 * Manages gaze data buffering for the three Tobii reading tasks.
 *
 * Encapsulates:
 * - Per-task gaze point refs (avoids re-renders)
 * - Active buffer switching as tasks progress
 * - Point counts for UI display
 * - Last gaze position for calibration & end-of-reading detection
 * - Line centers for Y-axis snapping
 * - Buffer clearing on retake / reset
 */
export function useTobiiTaskBuffers() {
  // ── Per-task gaze buffers (refs to avoid re-renders) ──
  const syllablesRef = useRef<TobiiGazePoint[]>([]);
  const pseudoWordsRef = useRef<TobiiGazePoint[]>([]);
  const meaningfulTextRef = useRef<TobiiGazePoint[]>([]);

  // ── Active buffer tracking ──
  const activeBufferRef = useRef<TobiiGazePoint[] | null>(null);
  const activeTaskKeyRef = useRef<TobiiTaskKey | null>(null);

  // ── UI state ──
  const [gazePointCount, setGazePointCount] = useState(0);
  const [taskPointCounts, setTaskPointCounts] = useState<Record<TobiiTaskKey, number>>({
    ...INITIAL_COUNTS,
  });
  const [lastTaskGazePosition, setLastTaskGazePosition] = useState<{ x: number; y: number } | null>(
    null,
  );

  // ── Last raw gaze ref (for calibration sampling) ──
  const lastGazeRef = useRef<{ x: number; y: number } | null>(null);

  // ── Task content ──
  const [taskContent, setTaskContent] = useState<Record<string, string>>({});

  // ── Y-axis line centers ──
  const lineCentersRef = useRef<Record<string, number[]>>({
    syllables: [],
    'pseudo-words': [],
    'meaningful-text': [],
  });

  /** Push incoming gaze points into the active buffer. */
  const pushGazeData = useCallback((points: TobiiGazePoint[]) => {
    if (points.length > 0) {
      const last = points[points.length - 1];
      lastGazeRef.current = { x: last.fixationX, y: last.fixationY };
      setLastTaskGazePosition({
        x: last.fixationX * window.screen.width,
        y: last.fixationY * window.screen.height,
      });
    }

    const activeBuffer = activeBufferRef.current;
    if (activeBuffer) {
      activeBuffer.push(...points);
      const nextCount = activeBuffer.length;
      setGazePointCount(nextCount);

      const activeTaskKey = activeTaskKeyRef.current;
      if (activeTaskKey) {
        setTaskPointCounts((prev) => ({ ...prev, [activeTaskKey]: nextCount }));
      }
    }
  }, []);

  /** Activate a specific task buffer and optionally set its content. */
  const activateTask = useCallback((taskKey: TobiiTaskKey, content: string) => {
    const bufferMap: Record<TobiiTaskKey, React.RefObject<TobiiGazePoint[]>> = {
      syllables: syllablesRef,
      'pseudo-words': pseudoWordsRef,
      'meaningful-text': meaningfulTextRef,
    };
    activeBufferRef.current = bufferMap[taskKey].current;
    activeTaskKeyRef.current = taskKey;
    setGazePointCount(0);
    setLastTaskGazePosition(null);
    setTaskContent((prev) => ({ ...prev, [taskKey]: content }));
  }, []);

  /** Clear the current active buffer (for retake). */
  const clearActiveBuffer = useCallback(() => {
    if (activeBufferRef.current) {
      activeBufferRef.current.length = 0;
    }
    const activeTaskKey = activeTaskKeyRef.current;
    if (activeTaskKey) {
      setTaskPointCounts((prev) => ({ ...prev, [activeTaskKey]: 0 }));
    }
    setGazePointCount(0);
    setLastTaskGazePosition(null);
  }, []);

  /** Store normalized line centers for a task. */
  const setLineCenters = useCallback((taskKey: string, centers: number[]) => {
    lineCentersRef.current[taskKey] = centers;
  }, []);

  /** Full reset — clears all buffers and state. */
  const resetAll = useCallback(() => {
    syllablesRef.current = [];
    pseudoWordsRef.current = [];
    meaningfulTextRef.current = [];
    activeBufferRef.current = null;
    activeTaskKeyRef.current = null;
    lastGazeRef.current = null;
    setGazePointCount(0);
    setTaskPointCounts({ ...INITIAL_COUNTS });
    setLastTaskGazePosition(null);
    setTaskContent({});
  }, []);

  return {
    // Refs for submission
    syllablesRef,
    pseudoWordsRef,
    meaningfulTextRef,
    lastGazeRef,
    lineCentersRef,

    // UI state
    gazePointCount,
    taskPointCounts,
    lastTaskGazePosition,
    taskContent,

    // Actions
    pushGazeData,
    activateTask,
    clearActiveBuffer,
    setLineCenters,
    resetAll,
  };
}
