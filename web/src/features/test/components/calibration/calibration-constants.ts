import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { CalibrationQuality } from '../../types';
import type { CalibrationVisualMode } from '../../lib/calibration-mode';

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
    motionDurationMs: 420,
    holdDurationMs: 900,
    gridMinDwellMs: 1000,
    gridMaxDwellMs: 3200,
    gridForceAdvanceMs: 5000,
    gridMinSamplesWebcam: 60,
    gridMinSamplesTobii: 6,
  },
  star: {
    motionDurationMs: 500,
    holdDurationMs: 1000,
    gridMinDwellMs: 1200,
    gridMaxDwellMs: 3500,
    gridForceAdvanceMs: 5500,
    gridMinSamplesWebcam: 60,
    gridMinSamplesTobii: 6,
  },
  stickman: {
    motionDurationMs: 500,
    holdDurationMs: 1000,
    gridMinDwellMs: 1200,
    gridMaxDwellMs: 3500,
    gridForceAdvanceMs: 5500,
    gridMinSamplesWebcam: 60,
    gridMinSamplesTobii: 6,
  },
};

export function getModeTiming(mode: CalibrationVisualMode = 'grid'): ModeTimingConfig {
  return MODE_TIMING[mode] || MODE_TIMING.grid;
}

export const SAMPLE_INTERVAL_MS = 33;
export const GRID_TIMEOUT_MIN_SAMPLES_WEBCAM = 2;

export const QUALITY_CONFIG: Record<
  CalibrationQuality,
  { color: string; icon: typeof CheckCircle2; label: string }
> = {
  good: { color: 'text-green-600', icon: CheckCircle2, label: 'ممتاز (Excellent)' },
  acceptable: { color: 'text-yellow-600', icon: AlertTriangle, label: 'مقبول (Acceptable)' },
  poor: { color: 'text-destructive', icon: XCircle, label: 'ضعيف (Poor)' },
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
    label: 'شبكة النقاط الكلاسيكية (Grid Calibration)',
    description: 'تتبع النقطة عبر نقاط المعايرة على الشاشة لضبط دقة تتبع العين.',
    ageHint: 'النمط الدقيق والمثالي لجميع الأعمار',
    image: '/images/calibration/default-mode.svg',
  },
];
