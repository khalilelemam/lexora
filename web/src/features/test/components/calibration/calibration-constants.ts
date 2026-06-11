import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { CalibrationQuality } from '../../types';
import type { CalibrationVisualMode } from '../../hooks/use-calibration-engine';

/**
 * Mode-specific calibration timing constants.
 *
 * Research rationale:
 * - Grid mode: fastest, targets are static — tight timings work well
 * - Star mode: targets float in with scale animation — need slightly longer
 *   settle time so the child can find and lock onto the target
 * - Stickman mode: animated ninja runs to position — needs the longest
 *   motion duration and more dwell time for the child to shift from
 *   tracking the animation to fixating on the target
 *
 * These values directly affect calibration quality.
 */

interface ModeTimingConfig {
  motionDurationMs: number;
  holdDurationMs: number;
  gridMinDwellMs: number;
  gridMaxDwellMs: number;
  gridForceAdvanceMs: number;
  gridMinSamplesWebcam: number;
  gridMinSamplesTobii: number;
}

const MODE_TIMING: Record<CalibrationVisualMode, ModeTimingConfig> = {
  grid: {
    motionDurationMs: 420, // Fast transition — target is just a dot
    holdDurationMs: 900, // Short hold — static target, easy to fixate
    gridMinDwellMs: 1000, // Min time before quality-based advance
    gridMaxDwellMs: 3200, // Max time before timeout advance
    gridForceAdvanceMs: 5000, // Force advance even with poor signal
    gridMinSamplesWebcam: 60,
    gridMinSamplesTobii: 6,
  },
  star: {
    motionDurationMs: 550, // Slightly longer — star scales in with animation
    holdDurationMs: 1100, // Longer hold — animated target needs settle time
    gridMinDwellMs: 1400, // More dwell — child needs time to find star
    gridMaxDwellMs: 4000, // More patient timeout
    gridForceAdvanceMs: 6000,
    gridMinSamplesWebcam: 7,
    gridMinSamplesTobii: 5,
  },
  stickman: {
    motionDurationMs: 600, // Longest — ninja runs/teleports to position
    holdDurationMs: 1200, // Longest hold — child shifts from tracking to fixating
    gridMinDwellMs: 1500, // Most patience — complex visual scene
    gridMaxDwellMs: 4500,
    gridForceAdvanceMs: 7000,
    gridMinSamplesWebcam: 6, // Slightly fewer — stickman mode has more visual noise
    gridMinSamplesTobii: 5,
  },
};

export function getModeTiming(mode: CalibrationVisualMode): ModeTimingConfig {
  return MODE_TIMING[mode];
}

// Export individual constants for backward compatibility
// These are the grid-mode defaults (most common)
export const MOTION_DURATION_MS = MODE_TIMING.grid.motionDurationMs;
export const HOLD_DURATION_MS = MODE_TIMING.grid.holdDurationMs;
export const SAMPLE_INTERVAL_MS = 33;
export const GRID_MIN_SAMPLES_WEBCAM = MODE_TIMING.grid.gridMinSamplesWebcam;
export const GRID_MIN_SAMPLES_TOBII = MODE_TIMING.grid.gridMinSamplesTobii;
export const GRID_MIN_DWELL_MS = MODE_TIMING.grid.gridMinDwellMs;
export const GRID_MAX_DWELL_MS = MODE_TIMING.grid.gridMaxDwellMs;
export const GRID_FORCE_ADVANCE_MS = MODE_TIMING.grid.gridForceAdvanceMs;
export const GRID_TIMEOUT_MIN_SAMPLES_WEBCAM = 2;
export const POINT_SAMPLES_GOAL_WEBCAM = 3;
export const POINT_SAMPLES_GOAL_TOBII = 3;

export const QUALITY_CONFIG: Record<
  CalibrationQuality,
  { color: string; icon: typeof CheckCircle2; label: string }
> = {
  good: { color: 'text-green-600', icon: CheckCircle2, label: 'Excellent' },
  acceptable: { color: 'text-yellow-600', icon: AlertTriangle, label: 'Acceptable' },
  poor: { color: 'text-destructive', icon: XCircle, label: 'Poor' },
};

export interface CalibrationModeOption {
  key: CalibrationVisualMode;
  label: string;
  description: string;
  ageHint: string;
  image: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

export const MODE_OPTIONS: CalibrationModeOption[] = [
  {
    key: 'grid',
    label: 'Classic Grid',
    description: 'Follow a simple dot across 20 calibration points. Fast and precise.',
    ageHint: 'Best for adults & older children',
    image: '/images/calibration/default-mode.svg',
  },
  {
    key: 'stickman',
    label: 'Ninja Stickman',
    description: 'Track a ninja stickman as it moves across the screen — defeat it with your gaze!',
    ageHint: 'Coming soon',
    image: '/images/calibration/stickman-mode.svg',
    disabled: true,
    comingSoon: true,
  },
  {
    key: 'star',
    label: 'Gentle Star',
    description: 'Follow a friendly star that appears at magical points. Calm and engaging.',
    ageHint: 'Recommended for ages 7–9',
    image: '/images/calibration/star-mode.svg',
  },
];
