import type { GazeFeature } from '@/features/test/types';

// ── CSV helpers ─────────────────────────────────────────────

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvRow(fields: (string | number | boolean)[]): string {
  return fields.map((f) => (typeof f === 'string' ? escapeCsvField(f) : String(f))).join(',');
}

// ── Derived feature CSV ─────────────────────────────────────

const DERIVED_HEADERS = [
  'index',
  'timestamp',
  'duration_ms',
  'fixation_x',
  'fixation_y',
  'saccade_amplitude',
  'efficiency_ratio',
  'is_regression',
  'is_return_sweep',
] as const;

/**
 * Converts an array of derived GazeFeature objects into a CSV string.
 * Used for `features_syllables.csv`, `features_pseudo.csv`, etc.
 */
export function featuresToCsv(features: GazeFeature[]): string {
  const lines = [DERIVED_HEADERS.join(',')];

  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    lines.push(
      toCsvRow([
        i,
        f.timestamp,
        f.durationMs,
        f.fixationX,
        f.fixationY,
        f.saccadeAmplitude,
        typeof f.efficiencyRatio === 'number' ? f.efficiencyRatio : '',
        f.isRegression,
        f.isReturnSweep ?? false,
      ]),
    );
  }

  return lines.join('\n') + '\n';
}

// ── Raw Tobii gaze CSV ──────────────────────────────────────

interface TobiiRawGazePoint {
  fixationX: number;
  fixationY: number;
  timestamp: number;
}

const RAW_TOBII_HEADERS = ['index', 'fixation_x', 'fixation_y', 'timestamp'] as const;

/**
 * Converts raw Tobii gaze points (per task) into a CSV string.
 * Used for `raw/{attemptId}/gaze_syllables.csv`, etc.
 */
export function rawTobiiGazeToCsv(points: TobiiRawGazePoint[]): string {
  const lines = [RAW_TOBII_HEADERS.join(',')];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    lines.push(toCsvRow([i, p.fixationX, p.fixationY, p.timestamp]));
  }

  return lines.join('\n') + '\n';
}

// ── Raw Webcam gaze CSV ─────────────────────────────────────

interface WebcamRawGazePoint {
  x: number;
  y: number;
  timestamp: number;
}

const RAW_WEBCAM_HEADERS = ['index', 'x', 'y', 'timestamp'] as const;

/**
 * Converts raw webcam gaze points into a CSV string.
 * Used for `raw/{attemptId}/gaze_paragraph.csv`.
 */
export function rawWebcamGazeToCsv(points: WebcamRawGazePoint[]): string {
  const lines = [RAW_WEBCAM_HEADERS.join(',')];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    lines.push(toCsvRow([i, p.x, p.y, p.timestamp]));
  }

  return lines.join('\n') + '\n';
}
