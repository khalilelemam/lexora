'use client';

import { useState, useCallback, useRef } from 'react';
import type { CalibrationResult, CalibrationQuality } from '../types';
import {
  CALIBRATION_POINTS,
  CALIBRATION_DOT_DURATION,
  CALIBRATION_SAMPLES_PER_POINT,
  CALIBRATION_THRESHOLDS,
} from '../lib/constants';

// ─── Types ───────────────────────────────────────────────

interface CollectedSample {
  /** Which calibration point this sample belongs to */
  pointIndex: number;
  /** Observed gaze X (normalized 0-1 for Tobii, or iris coords for webcam) */
  observedX: number;
  /** Observed gaze Y */
  observedY: number;
}

interface CalibrationMappingCoeffs {
  xCoeffs: number[];
  yCoeffs: number[];
}

type CalibrationPhase = 'idle' | 'collecting' | 'validating' | 'complete';

// ─── Polynomial Regression ───────────────────────────────

/**
 * Fit a 2nd-order polynomial: val = a0 + a1*x + a2*y + a3*x^2 + a4*y^2 + a5*x*y
 * Uses least-squares via normal equations (A^T A)^-1 A^T b.
 * With 9-point calibration we have an overdetermined system (9 rows, 6 unknowns).
 */
function fitPolynomial(inputs: [number, number][], outputs: number[]): number[] {
  const n = inputs.length;
  if (n === 0) {
    // No data — return identity-like zero coefficients
    return [0, 0, 0, 0, 0, 0];
  }
  if (n < 6) {
    // Not enough points for 2nd order — fall back to linear (3 coefficients)
    return fitLinear(inputs, outputs);
  }

  // Build design matrix
  const A: number[][] = inputs.map(([x, y]) => [1, x, y, x * x, y * y, x * y]);
  return solveNormalEquations(A, outputs);
}

function fitLinear(inputs: [number, number][], outputs: number[]): number[] {
  const A: number[][] = inputs.map(([x, y]) => [1, x, y, 0, 0, 0]);
  return solveNormalEquations(A, outputs);
}

function solveNormalEquations(A: number[][], b: number[]): number[] {
  if (A.length === 0 || !A[0]) {
    return [0, 0, 0, 0, 0, 0];
  }
  const cols = A[0].length;
  const n = A.length;

  // A^T * A
  const ATA: number[][] = Array.from({ length: cols }, () => new Array(cols).fill(0) as number[]);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < cols; j++) {
      for (let k = 0; k < n; k++) {
        ATA[i][j] += A[k][i] * A[k][j];
      }
    }
  }

  // A^T * b
  const ATb: number[] = new Array(cols).fill(0) as number[];
  for (let i = 0; i < cols; i++) {
    for (let k = 0; k < n; k++) {
      ATb[i] += A[k][i] * b[k];
    }
  }

  // Solve via Gauss-Jordan elimination
  const augmented: number[][] = ATA.map((row, i) => [...row, ATb[i]]);

  for (let col = 0; col < cols; col++) {
    // Partial pivoting
    let maxRow = col;
    for (let row = col + 1; row < cols; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
        maxRow = row;
      }
    }
    [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

    const pivot = augmented[col][col];
    if (Math.abs(pivot) < 1e-10) continue;

    for (let j = col; j <= cols; j++) {
      augmented[col][j] /= pivot;
    }

    for (let row = 0; row < cols; row++) {
      if (row === col) continue;
      const factor = augmented[row][col];
      for (let j = col; j <= cols; j++) {
        augmented[row][j] -= factor * augmented[col][j];
      }
    }
  }

  return augmented.map((row) => row[cols]);
}

// ─── Hook ────────────────────────────────────────────────

export function useCalibration() {
  const [phase, setPhase] = useState<CalibrationPhase>('idle');
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const samplesRef = useRef<CollectedSample[]>([]);

  const points = CALIBRATION_POINTS;

  // ─── Add a gaze sample during calibration ───────────

  const addSample = useCallback(
    (observedX: number, observedY: number) => {
      if (phase !== 'collecting') return;
      samplesRef.current.push({
        pointIndex: currentPointIndex,
        observedX,
        observedY,
      });
    },
    [phase, currentPointIndex],
  );

  // ─── Advance to next calibration point ──────────────

  const advancePoint = useCallback(() => {
    if (currentPointIndex < points.length - 1) {
      setCurrentPointIndex((prev) => prev + 1);
    } else {
      // All points collected — compute results
      setPhase('validating');
    }
  }, [currentPointIndex, points.length]);

  // ─── Start calibration ─────────────────────────────

  const startCalibration = useCallback(() => {
    samplesRef.current = [];
    setCurrentPointIndex(0);
    setResult(null);
    setPhase('collecting');
  }, []);

  // ─── Compute calibration quality (Tobii) ────────────
  // For Tobii: gaze data is already in normalized screen coords (0-1)
  // We measure the average distance from the expected calibration point

  const computeTobiiCalibration = useCallback((): CalibrationResult => {
    const samples = samplesRef.current;
    const pointAccuracies: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const pointSamples = samples.filter((s) => s.pointIndex === i);
      if (pointSamples.length === 0) {
        pointAccuracies.push(1.0); // worst case
        continue;
      }

      const errors = pointSamples.map((s) => {
        const dx = s.observedX - points[i].x;
        const dy = s.observedY - points[i].y;
        return Math.sqrt(dx * dx + dy * dy);
      });
      pointAccuracies.push(errors.reduce((a, b) => a + b, 0) / errors.length);
    }

    const averageError = pointAccuracies.reduce((a, b) => a + b, 0) / pointAccuracies.length;
    let quality: CalibrationQuality = 'poor';
    if (averageError < CALIBRATION_THRESHOLDS.good) quality = 'good';
    else if (averageError < CALIBRATION_THRESHOLDS.acceptable) quality = 'acceptable';

    const calibResult: CalibrationResult = { quality, pointAccuracies, averageError };
    setResult(calibResult);
    setPhase('complete');
    return calibResult;
  }, [points]);

  // ─── Compute webcam calibration mapping ─────────────
  // For webcam: we have iris positions → we fit a polynomial to map them to screen coords

  const computeWebcamCalibration = useCallback(
    (screenWidth: number, screenHeight: number): { result: CalibrationResult; mapping: CalibrationMappingCoeffs } => {
      const samples = samplesRef.current;

      // Inputs: (irisX, irisY), Outputs: (screenX, screenY) from known calibration points
      const inputs: [number, number][] = [];
      const outputsX: number[] = [];
      const outputsY: number[] = [];

      for (let i = 0; i < points.length; i++) {
        const pointSamples = samples.filter((s) => s.pointIndex === i);
        if (pointSamples.length === 0) continue;

        // Average iris position for this calibration point
        const avgX = pointSamples.reduce((a, s) => a + s.observedX, 0) / pointSamples.length;
        const avgY = pointSamples.reduce((a, s) => a + s.observedY, 0) / pointSamples.length;

        inputs.push([avgX, avgY]);
        outputsX.push(points[i].x * screenWidth);
        outputsY.push(points[i].y * screenHeight);
      }

      const xCoeffs = fitPolynomial(inputs, outputsX);
      const yCoeffs = fitPolynomial(inputs, outputsY);

      // Estimate quality by computing mapping error on training data
      const pointAccuracies: number[] = [];
      for (let i = 0; i < inputs.length; i++) {
        const [ix, iy] = inputs[i];
        const predX =
          xCoeffs[0] +
          xCoeffs[1] * ix +
          xCoeffs[2] * iy +
          xCoeffs[3] * ix * ix +
          xCoeffs[4] * iy * iy +
          xCoeffs[5] * ix * iy;
        const predY =
          yCoeffs[0] +
          yCoeffs[1] * ix +
          yCoeffs[2] * iy +
          yCoeffs[3] * ix * ix +
          yCoeffs[4] * iy * iy +
          yCoeffs[5] * ix * iy;

        // Normalized error
        const dx = (predX - outputsX[i]) / screenWidth;
        const dy = (predY - outputsY[i]) / screenHeight;
        pointAccuracies.push(Math.sqrt(dx * dx + dy * dy));
      }

      const averageError =
        pointAccuracies.length > 0
          ? pointAccuracies.reduce((a, b) => a + b, 0) / pointAccuracies.length
          : 1.0;

      let quality: CalibrationQuality = 'poor';
      if (averageError < CALIBRATION_THRESHOLDS.good) quality = 'good';
      else if (averageError < CALIBRATION_THRESHOLDS.acceptable) quality = 'acceptable';

      const calibResult: CalibrationResult = { quality, pointAccuracies, averageError };
      setResult(calibResult);
      setPhase('complete');
      return { result: calibResult, mapping: { xCoeffs, yCoeffs } };
    },
    [points],
  );

  // ─── Reset ──────────────────────────────────────────

  const resetCalibration = useCallback(() => {
    samplesRef.current = [];
    setCurrentPointIndex(0);
    setResult(null);
    setPhase('idle');
  }, []);

  return {
    // State
    phase,
    currentPointIndex,
    currentPoint: points[currentPointIndex] ?? points[0],
    totalPoints: points.length,
    result,
    samplesPerPoint: CALIBRATION_SAMPLES_PER_POINT,
    dotDuration: CALIBRATION_DOT_DURATION,
    // Actions
    startCalibration,
    addSample,
    advancePoint,
    computeTobiiCalibration,
    computeWebcamCalibration,
    resetCalibration,
  };
}
