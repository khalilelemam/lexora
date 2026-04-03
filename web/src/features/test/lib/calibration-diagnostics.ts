/**
 * Pure diagnostic functions for calibration quality analysis.
 *
 * These functions compute detailed metrics to diagnose why calibration
 * may be failing, covering:
 * - Per-point error breakdown
 * - Axis correlation
 * - Screen coverage
 * - Iris input range
 * - Head pose stability
 * - Heatmap logging
 */

import type { CalibrationDiagnostics, HeadPoseSample } from '../types';
import type { CalibrationModel } from './calibration-models';

// ─── Internal Helpers ────────────────────────────────────

function pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n < 2) return 0;

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let denX = 0;
    let denY = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }

    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
}

function stdDev(values: number[], mean: number): number {
    if (values.length < 2) return 0;
    const variance =
        values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
}

// ─── Diagnostic Input ────────────────────────────────────

export interface DiagnosticInput {
    /** Per-point averaged iris positions (for correlation / heatmap) */
    fittedInputs: [number, number][];
    /** Target screen X coordinates for each fitted point */
    targetScreenX: number[];
    /** Target screen Y coordinates for each fitted point */
    targetScreenY: number[];
    /** Best model (model-agnostic predict) */
    bestModel: CalibrationModel;
    /** Screen width in pixels */
    screenWidth: number;
    /** Screen height in pixels */
    screenHeight: number;
    /** Calibration point definitions (normalized 0-1) */
    calibrationPoints: readonly { x: number; y: number }[];
    /** Raw iris samples per calibration point (one array per point) */
    rawSamplesPerPoint: Array<Array<{ observedX: number; observedY: number }>>;
    /** Raw samples with head pose for model-aware prediction */
    rawSamplesWithPose: Array<{ observedX: number; observedY: number; yaw: number; pitch: number; pointIndex: number }>;
    /** Head pose samples collected during calibration */
    headPoseSamples?: HeadPoseSample[];
}

// ─── Main Diagnostic Computation ─────────────────────────

export function computeCalibrationDiagnostics(
    input: DiagnosticInput,
): CalibrationDiagnostics {
    const {
        fittedInputs,
        targetScreenX,
        targetScreenY,
        bestModel,
        screenWidth,
        screenHeight,
        calibrationPoints,
        rawSamplesPerPoint,
        rawSamplesWithPose,
        headPoseSamples,
    } = input;

    // ─── 1. Per-point error breakdown (using ALL raw samples) ───

    const allErrors: number[] = [];
    const allPredictions: Array<{ x: number; y: number }> = [];

    const perPointErrors = calibrationPoints.map((point, idx) => {
        const targetX = point.x * screenWidth;
        const targetY = point.y * screenHeight;

        // Use samples with pose for model-aware prediction
        const poseSamples = rawSamplesWithPose.filter((s) => s.pointIndex === idx);

        if (poseSamples.length === 0) {
            return {
                point: { x: point.x, y: point.y },
                meanError: 0,
                stdError: 0,
                sampleCount: 0,
            };
        }

        const errors = poseSamples.map((s) => {
            const pred = bestModel.predict(s.observedX, s.observedY, s.yaw, s.pitch);
            allPredictions.push(pred);
            const err = Math.sqrt((pred.x - targetX) ** 2 + (pred.y - targetY) ** 2);
            allErrors.push(err);
            return err;
        });

        const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
        const std = stdDev(errors, mean);

        return {
            point: { x: point.x, y: point.y },
            meanError: mean,
            stdError: std,
            sampleCount: poseSamples.length,
        };
    });

    // ─── 2. Overall error metrics ───

    const meanErrorPx =
        allErrors.length > 0
            ? allErrors.reduce((a, b) => a + b, 0) / allErrors.length
            : 0;

    const sortedErrors = [...allErrors].sort((a, b) => a - b);
    const medianErrorPx =
        sortedErrors.length > 0
            ? sortedErrors.length % 2 === 0
                ? (sortedErrors[sortedErrors.length / 2 - 1] +
                    sortedErrors[sortedErrors.length / 2]) /
                2
                : sortedErrors[Math.floor(sortedErrors.length / 2)]
            : 0;

    const screenDiagonal = Math.sqrt(screenWidth ** 2 + screenHeight ** 2);
    const meanErrorNormalized =
        screenDiagonal > 0 ? meanErrorPx / screenDiagonal : 0;

    // ─── 3. Axis correlation (averaged predictions vs targets) ───

    const avgPredX: number[] = [];
    const avgPredY: number[] = [];

    // Use per-point averaged samples with their average pose for correlation
    for (let i = 0; i < calibrationPoints.length; i++) {
        const ptSamples = rawSamplesWithPose.filter((s) => s.pointIndex === i);
        if (ptSamples.length === 0) continue;
        const avgIx = ptSamples.reduce((a, s) => a + s.observedX, 0) / ptSamples.length;
        const avgIy = ptSamples.reduce((a, s) => a + s.observedY, 0) / ptSamples.length;
        const avgYaw = ptSamples.reduce((a, s) => a + s.yaw, 0) / ptSamples.length;
        const avgPitch = ptSamples.reduce((a, s) => a + s.pitch, 0) / ptSamples.length;
        const pred = bestModel.predict(avgIx, avgIy, avgYaw, avgPitch);
        avgPredX.push(pred.x);
        avgPredY.push(pred.y);
    }

    // Rebuild target arrays to match only points that had samples
    const filteredTargetX: number[] = [];
    const filteredTargetY: number[] = [];
    for (let i = 0; i < calibrationPoints.length; i++) {
        const ptSamples = rawSamplesWithPose.filter((s) => s.pointIndex === i);
        if (ptSamples.length === 0) continue;
        filteredTargetX.push(calibrationPoints[i].x * screenWidth);
        filteredTargetY.push(calibrationPoints[i].y * screenHeight);
    }

    const corrX = pearsonCorrelation(avgPredX, filteredTargetX);
    const corrY = pearsonCorrelation(avgPredY, filteredTargetY);

    // ─── 4. Screen coverage (from all raw-sample predictions) ───

    let predMinX = Infinity;
    let predMaxX = -Infinity;
    let predMinY = Infinity;
    let predMaxY = -Infinity;

    for (const p of allPredictions) {
        if (p.x < predMinX) predMinX = p.x;
        if (p.x > predMaxX) predMaxX = p.x;
        if (p.y < predMinY) predMinY = p.y;
        if (p.y > predMaxY) predMaxY = p.y;
    }

    // Handle edge case where no predictions exist
    if (allPredictions.length === 0) {
        predMinX = 0;
        predMaxX = 0;
        predMinY = 0;
        predMaxY = 0;
    }

    const coverage = {
        minX: predMinX,
        maxX: predMaxX,
        minY: predMinY,
        maxY: predMaxY,
        widthCoverage:
            screenWidth > 0 ? (predMaxX - predMinX) / screenWidth : 0,
        heightCoverage:
            screenHeight > 0 ? (predMaxY - predMinY) / screenHeight : 0,
    };

    // ─── 5. Iris input range ───

    let irisMinX = Infinity;
    let irisMaxX = -Infinity;
    let irisMinY = Infinity;
    let irisMaxY = -Infinity;

    for (const pointSamples of rawSamplesPerPoint) {
        for (const s of pointSamples) {
            if (s.observedX < irisMinX) irisMinX = s.observedX;
            if (s.observedX > irisMaxX) irisMaxX = s.observedX;
            if (s.observedY < irisMinY) irisMinY = s.observedY;
            if (s.observedY > irisMaxY) irisMaxY = s.observedY;
        }
    }

    // Handle edge case
    if (irisMinX === Infinity) {
        irisMinX = 0;
        irisMaxX = 0;
        irisMinY = 0;
        irisMaxY = 0;
    }

    const irisRange = {
        minX: irisMinX,
        maxX: irisMaxX,
        minY: irisMinY,
        maxY: irisMaxY,
    };

    // ─── 6. Head pose diagnostics ───

    let headPose = { meanYaw: 0, meanPitch: 0, stdYaw: 0, stdPitch: 0 };

    if (headPoseSamples && headPoseSamples.length > 0) {
        const yaws = headPoseSamples.map((s) => s.yaw);
        const pitches = headPoseSamples.map((s) => s.pitch);
        const meanYaw = yaws.reduce((a, b) => a + b, 0) / yaws.length;
        const meanPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
        headPose = {
            meanYaw,
            meanPitch,
            stdYaw: stdDev(yaws, meanYaw),
            stdPitch: stdDev(pitches, meanPitch),
        };
    }

    // ─── 7. Heatmap pairs (averaged predictions vs targets) ───

    const heatmapPairs: CalibrationDiagnostics['heatmapPairs'] = [];
    let hIdx = 0;
    for (let i = 0; i < calibrationPoints.length; i++) {
        const ptSamples = rawSamplesWithPose.filter((s) => s.pointIndex === i);
        if (ptSamples.length === 0) continue;
        heatmapPairs.push({
            target: { x: calibrationPoints[i].x * screenWidth, y: calibrationPoints[i].y * screenHeight },
            predicted: { x: avgPredX[hIdx], y: avgPredY[hIdx] },
        });
        hIdx++;
    }

    return {
        perPointErrors,
        corrX,
        corrY,
        coverage,
        meanErrorPx,
        meanErrorNormalized,
        medianErrorPx,
        irisRange,
        headPose,
        heatmapPairs,
    };
}

// ─── Console Logging ─────────────────────────────────────

export function logCalibrationDiagnostics(
    diagnostics: CalibrationDiagnostics,
): void {
    console.group('🔬 Calibration Diagnostics');

    // ── Summary ───
    console.log(
        `Mean Error: ${diagnostics.meanErrorPx.toFixed(1)}px ` +
        `(normalized: ${(diagnostics.meanErrorNormalized * 100).toFixed(2)}%)`,
    );
    console.log(`Median Error: ${diagnostics.medianErrorPx.toFixed(1)}px`);

    // ── Per-point ───
    console.group('📍 Per-Point Errors');
    for (const p of diagnostics.perPointErrors) {
        console.log(
            `Point (${p.point.x},${p.point.y}): ` +
            `mean=${p.meanError.toFixed(1)}px ` +
            `std=${p.stdError.toFixed(1)}px ` +
            `samples=${p.sampleCount}`,
        );
    }
    console.groupEnd();

    // ── Axis correlation ───
    console.group('📊 Axis Correlation');
    const corrXStatus = diagnostics.corrX > 0.85 ? '✅' : '❌';
    const corrYStatus = diagnostics.corrY > 0.85 ? '✅' : '❌';
    console.log(
        `corr_x = ${diagnostics.corrX.toFixed(4)} ${corrXStatus} (threshold: 0.85)`,
    );
    console.log(
        `corr_y = ${diagnostics.corrY.toFixed(4)} ${corrYStatus} (threshold: 0.85)`,
    );
    console.groupEnd();

    // ── Screen coverage ───
    console.group('📐 Screen Coverage');
    console.log(
        `Predicted X range: ${diagnostics.coverage.minX.toFixed(0)} → ${diagnostics.coverage.maxX.toFixed(0)}`,
    );
    console.log(
        `Predicted Y range: ${diagnostics.coverage.minY.toFixed(0)} → ${diagnostics.coverage.maxY.toFixed(0)}`,
    );
    const widthOk = diagnostics.coverage.widthCoverage >= 0.3 ? '✅' : '❌';
    const heightOk = diagnostics.coverage.heightCoverage >= 0.3 ? '✅' : '❌';
    console.log(
        `Width coverage: ${(diagnostics.coverage.widthCoverage * 100).toFixed(1)}% ${widthOk} (threshold: 30%)`,
    );
    console.log(
        `Height coverage: ${(diagnostics.coverage.heightCoverage * 100).toFixed(1)}% ${heightOk} (threshold: 30%)`,
    );
    console.groupEnd();

    // ── Iris range ───
    console.group('👁️ Iris Input Range');
    console.log(
        `Iris X range: ${diagnostics.irisRange.minX.toFixed(4)} → ${diagnostics.irisRange.maxX.toFixed(4)}`,
    );
    console.log(
        `Iris Y range: ${diagnostics.irisRange.minY.toFixed(4)} → ${diagnostics.irisRange.maxY.toFixed(4)}`,
    );
    const irisXSpan = diagnostics.irisRange.maxX - diagnostics.irisRange.minX;
    const irisYSpan = diagnostics.irisRange.maxY - diagnostics.irisRange.minY;
    if (irisXSpan < 0.05 || irisYSpan < 0.05) {
        console.warn(
            '⚠️ Iris coordinate range is extremely small — polynomial cannot learn screen mapping',
        );
    }
    console.groupEnd();

    // ── Head pose ───
    console.group('🗣️ Head Pose');
    console.log(
        `Mean yaw: ${diagnostics.headPose.meanYaw.toFixed(4)}, std: ${diagnostics.headPose.stdYaw.toFixed(4)}`,
    );
    console.log(
        `Mean pitch: ${diagnostics.headPose.meanPitch.toFixed(4)}, std: ${diagnostics.headPose.stdPitch.toFixed(4)}`,
    );
    if (
        diagnostics.headPose.stdYaw > 0.05 ||
        diagnostics.headPose.stdPitch > 0.05
    ) {
        console.warn(
            '⚠️ High head pose variance — calibration samples may be inconsistent',
        );
    }
    console.groupEnd();

    // ── Heatmap (target → predicted) ───
    console.group('🗺️ Calibration Heatmap (Target → Predicted)');
    for (const pair of diagnostics.heatmapPairs) {
        console.log(
            `target=(${pair.target.x.toFixed(0)},${pair.target.y.toFixed(0)}) ` +
            `pred=(${pair.predicted.x.toFixed(0)},${pair.predicted.y.toFixed(0)})`,
        );
    }
    console.groupEnd();

    console.groupEnd();
}
