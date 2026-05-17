import type { CalibrationMode, RiskLevel, TestMode } from '@/features/test/types';

export const TEST_TYPE_LABELS: Record<TestMode, string> = {
  tobii: 'Tobii',
  webcam: 'Webcam',
};

export const OUTCOME_LABELS: Record<RiskLevel, string> = {
  low: 'Low Risk',
  medium: 'Possible Indicators',
  high: 'High Risk',
};

export const CALIBRATION_MODE_LABELS: Record<CalibrationMode, string> = {
  grid: 'Grid',
  star: 'Star',
  stickman: 'Stickman',
};

export function formatAttemptDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
