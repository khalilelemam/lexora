import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { CalibrationQuality } from '../../types';
import type { CalibrationVisualMode } from '../../hooks/use-calibration-engine';

export const MOTION_DURATION_MS = 460;
export const HOLD_DURATION_MS = 1000;
export const SAMPLE_INTERVAL_MS = 33;
export const GRID_MIN_SAMPLES_WEBCAM = 8;
export const GRID_MIN_SAMPLES_TOBII = 6;
export const GRID_MIN_DWELL_MS = 1200;
export const GRID_MAX_DWELL_MS = 3500;
export const GRID_FORCE_ADVANCE_MS = 5500;
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
}

export const MODE_OPTIONS: CalibrationModeOption[] = [
  {
    key: 'grid',
    label: 'Classic Grid',
    description: 'Follow a simple dot across 15 calibration points. Fast and precise.',
    ageHint: 'Best for adults & older children',
    image: '/images/calibration/default-mode.svg',
  },
  {
    key: 'stickman',
    label: 'Action Stickman',
    description: 'Track a stickman character as it moves across the screen — defeat it with your gaze!',
    ageHint: 'Recommended for ages 10+',
    image: '/images/calibration/stickman-mode.svg',
  },
  {
    key: 'star',
    label: 'Gentle Star',
    description: 'Follow a friendly star that floats between magical points. Calm and engaging.',
    ageHint: 'Recommended for ages 7–9',
    image: '/images/calibration/star-mode.svg',
  },
];
