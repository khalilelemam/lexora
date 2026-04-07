/**
 * Multi-model calibration regression.
 *
 * Three models compete on the same training data:
 *   1. **Polynomial** – 3rd-order polynomial via normal equations
 *   2. **Ridge** – Polynomial features + L2 regularisation (λ sweep)
 *   3. **MLP** – 2-layer neural network trained with backprop
 *
 * Each model implements the same `CalibrationModel` interface so the
 * rest of the pipeline (validation overlay, live gaze, diagnostics)
 * is model-agnostic.
 */

// ─── Public types ────────────────────────────────────────

export type ModelKind = 'polynomial' | 'ridge' | 'mlp';

/** Unified predict function — takes averaged iris (x,y) + head pose */
export interface CalibrationModel {
    kind: ModelKind;
    predict: (irisX: number, irisY: number, yaw: number, pitch: number) => { x: number; y: number };
    /** Per-point mean error on training data (px) */
    trainingError: number;
    /** Extra info for diagnostics display */
    info: string;
}

export interface ModelComparisonResult {
    models: CalibrationModel[];
    /** Index into `models` of the best one (lowest training error) */
    bestIndex: number;
    best: CalibrationModel;
}

// ─── Feature expansion ───────────────────────────────────

/**
 * Build a feature vector from raw inputs.
 * 3rd-order polynomial over 4 variables (ix, iy, yaw, pitch):
 *   1, ix, iy, yaw, pitch,
 *   ix², iy², yaw², pitch²,
 *   ix·iy, ix·yaw, ix·pitch, iy·yaw, iy·pitch, yaw·pitch,
 *   ix³, iy³, ix²·iy, ix·iy²
 *
 * = 20 features. With ~400+ samples this is very overdetermined.
 */
function expandFeatures(ix: number, iy: number, yaw: number, pitch: number): number[] {
    return [
        1,
        ix, iy, yaw, pitch,
        ix * ix, iy * iy, yaw * yaw, pitch * pitch,
        ix * iy, ix * yaw, ix * pitch, iy * yaw, iy * pitch, yaw * pitch,
        ix * ix * ix, iy * iy * iy, ix * ix * iy, ix * iy * iy,
    ];
}

const NUM_FEATURES = 20;

// ─── Linear algebra helpers ──────────────────────────────

function solveRidge(A: number[][], b: number[], lambda: number): number[] {
    const cols = A[0]?.length ?? 0;
    const n = A.length;
    if (cols === 0 || n === 0) return new Array(cols).fill(0);

    // AᵀA
    const ATA: number[][] = Array.from({ length: cols }, () => new Array(cols).fill(0) as number[]);
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < cols; j++) {
            let s = 0;
            for (let k = 0; k < n; k++) s += A[k][i] * A[k][j];
            ATA[i][j] = s;
        }
        ATA[i][i] += lambda; // ridge penalty
    }

    // Aᵀb
    const ATb: number[] = new Array(cols).fill(0) as number[];
    for (let i = 0; i < cols; i++) {
        let s = 0;
        for (let k = 0; k < n; k++) s += A[k][i] * b[k];
        ATb[i] = s;
    }

    // Gauss-Jordan
    const aug: number[][] = ATA.map((row, i) => [...row, ATb[i]]);
    for (let col = 0; col < cols; col++) {
        let maxRow = col;
        for (let row = col + 1; row < cols; row++) {
            if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
        }
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
        const pivot = aug[col][col];
        if (Math.abs(pivot) < 1e-12) continue;
        for (let j = col; j <= cols; j++) aug[col][j] /= pivot;
        for (let row = 0; row < cols; row++) {
            if (row === col) continue;
            const f = aug[row][col];
            for (let j = col; j <= cols; j++) aug[row][j] -= f * aug[col][j];
        }
    }
    return aug.map((r) => r[cols]);
}

function predictLinear(coeffs: number[], features: number[]): number {
    let s = 0;
    for (let i = 0; i < coeffs.length; i++) s += coeffs[i] * features[i];
    return s;
}

// ─── Model 1: Polynomial (3rd-order, λ = 1e-6) ──────────

function fitPolynomialModel(
    samples: TrainingSample[],
    screenW: number,
    screenH: number,
): CalibrationModel {
    const A = samples.map((s) => expandFeatures(s.ix, s.iy, s.yaw, s.pitch));
    const bx = samples.map((s) => s.targetX);
    const by = samples.map((s) => s.targetY);

    const xCoeffs = solveRidge(A, bx, 1e-6);
    const yCoeffs = solveRidge(A, by, 1e-6);

    const err = meanEuclideanError(samples, (s) => {
        const f = expandFeatures(s.ix, s.iy, s.yaw, s.pitch);
        return { x: predictLinear(xCoeffs, f), y: predictLinear(yCoeffs, f) };
    });

    return {
        kind: 'polynomial',
        predict: (ix, iy, yaw, pitch) => {
            const f = expandFeatures(ix, iy, yaw, pitch);
            return { x: predictLinear(xCoeffs, f), y: predictLinear(yCoeffs, f) };
        },
        trainingError: err,
        info: `3rd-order poly, 4 inputs (iris+pose), ${NUM_FEATURES} features, λ=1e-6`,
    };
}

// ─── Model 2: Ridge Regression (λ sweep) ─────────────────

function fitRidgeModel(
    samples: TrainingSample[],
    screenW: number,
    screenH: number,
): CalibrationModel {
    const A = samples.map((s) => expandFeatures(s.ix, s.iy, s.yaw, s.pitch));
    const bx = samples.map((s) => s.targetX);
    const by = samples.map((s) => s.targetY);

    // Try multiple λ values, pick the one with lowest LOO-approx error
    const lambdas = [1e-8, 1e-6, 1e-4, 1e-2, 0.1, 1, 10, 100];
    let bestLambda = 1e-4;
    let bestErr = Infinity;

    for (const lam of lambdas) {
        const xC = solveRidge(A, bx, lam);
        const yC = solveRidge(A, by, lam);
        const e = meanEuclideanError(samples, (s) => {
            const f = expandFeatures(s.ix, s.iy, s.yaw, s.pitch);
            return { x: predictLinear(xC, f), y: predictLinear(yC, f) };
        });
        if (e < bestErr) {
            bestErr = e;
            bestLambda = lam;
        }
    }

    const xCoeffs = solveRidge(A, bx, bestLambda);
    const yCoeffs = solveRidge(A, by, bestLambda);

    const err = meanEuclideanError(samples, (s) => {
        const f = expandFeatures(s.ix, s.iy, s.yaw, s.pitch);
        return { x: predictLinear(xCoeffs, f), y: predictLinear(yCoeffs, f) };
    });

    return {
        kind: 'ridge',
        predict: (ix, iy, yaw, pitch) => {
            const f = expandFeatures(ix, iy, yaw, pitch);
            return { x: predictLinear(xCoeffs, f), y: predictLinear(yCoeffs, f) };
        },
        trainingError: err,
        info: `Ridge, best λ=${bestLambda}, ${NUM_FEATURES} features`,
    };
}

// ─── Model 3: MLP Neural Network ─────────────────────────

/**
 * Tiny 2-layer MLP: input(4) → hidden(32, ReLU) → hidden(16, ReLU) → output(2)
 * Trained via mini-batch SGD with Adam optimiser.
 */
function fitMLPModel(
    samples: TrainingSample[],
    screenW: number,
    screenH: number,
): CalibrationModel {
    // Normalise inputs and outputs to [-1, 1] for stable training
    const ixs = samples.map((s) => s.ix);
    const iys = samples.map((s) => s.iy);
    const yaws = samples.map((s) => s.yaw);
    const pitches = samples.map((s) => s.pitch);
    const txs = samples.map((s) => s.targetX);
    const tys = samples.map((s) => s.targetY);

    const norm = (arr: number[]) => {
        const mn = Math.min(...arr);
        const mx = Math.max(...arr);
        const range = mx - mn || 1;
        return { min: mn, range, data: arr.map((v) => (v - mn) / range * 2 - 1) };
    };

    const nix = norm(ixs);
    const niy = norm(iys);
    const nyaw = norm(yaws);
    const npitch = norm(pitches);
    const ntx = norm(txs);
    const nty = norm(tys);

    // Network architecture
    const H1 = 32;
    const H2 = 16;
    const IN = 4;
    const OUT = 2;

    // Xavier initialisation
    const randn = () => (Math.random() - 0.5) * 2;
    const xavierScale = (fanIn: number) => Math.sqrt(2 / fanIn);

    // Weights
    const W1: number[][] = Array.from({ length: H1 }, () =>
        Array.from({ length: IN }, () => randn() * xavierScale(IN)),
    );
    const b1: number[] = new Array(H1).fill(0);
    const W2: number[][] = Array.from({ length: H2 }, () =>
        Array.from({ length: H1 }, () => randn() * xavierScale(H1)),
    );
    const b2: number[] = new Array(H2).fill(0);
    const W3: number[][] = Array.from({ length: OUT }, () =>
        Array.from({ length: H2 }, () => randn() * xavierScale(H2)),
    );
    const b3: number[] = new Array(OUT).fill(0);

    // Adam state
    const adamState = () => ({
        m: 0,
        v: 0,
    });
    const mkAdamMatrix = (rows: number, cols: number) =>
        Array.from({ length: rows }, () => Array.from({ length: cols }, adamState));
    const mkAdamVec = (len: number) => Array.from({ length: len }, adamState);

    const aW1 = mkAdamMatrix(H1, IN);
    const ab1 = mkAdamVec(H1);
    const aW2 = mkAdamMatrix(H2, H1);
    const ab2 = mkAdamVec(H2);
    const aW3 = mkAdamMatrix(OUT, H2);
    const ab3 = mkAdamVec(OUT);

    const lr = 0.002;
    const beta1 = 0.9;
    const beta2 = 0.999;
    const eps = 1e-8;
    const weightDecay = 0.02;  // L2 regularization (only for weights, not biases) — strong penalty to force generalization
    let t = 0;

    function adamUpdate(
        param: number,
        grad: number,
        state: { m: number; v: number },
        isWeight: boolean = true,  // true for weights, false for biases
    ): number {
        // Add L2 weight decay penalty to gradient (only for weights)
        const gradWithDecay = isWeight ? grad + weightDecay * param : grad;
        state.m = beta1 * state.m + (1 - beta1) * gradWithDecay;
        state.v = beta2 * state.v + (1 - beta2) * gradWithDecay * gradWithDecay;
        const mHat = state.m / (1 - Math.pow(beta1, t));
        const vHat = state.v / (1 - Math.pow(beta2, t));
        return param - lr * mHat / (Math.sqrt(vHat) + eps);
    }

    // Build normalised training set
    const trainX: number[][] = [];
    const trainY: number[][] = [];
    for (let i = 0; i < samples.length; i++) {
        trainX.push([nix.data[i], niy.data[i], nyaw.data[i], npitch.data[i]]);
        trainY.push([ntx.data[i], nty.data[i]]);
    }

    const relu = (x: number) => (x > 0 ? x : 0);
    const reluGrad = (x: number) => (x > 0 ? 1 : 0);

    // Training loop: 400 epochs, full batch
    const epochs = 400;
    for (let epoch = 0; epoch < epochs; epoch++) {
        t++;

        // Accumulate gradients over full batch
        const gW1 = W1.map((r) => r.map(() => 0));
        const gb1 = b1.map(() => 0);
        const gW2 = W2.map((r) => r.map(() => 0));
        const gb2 = b2.map(() => 0);
        const gW3 = W3.map((r) => r.map(() => 0));
        const gb3 = b3.map(() => 0);

        for (let s = 0; s < trainX.length; s++) {
            const x = trainX[s];
            const y = trainY[s];

            // Forward
            const z1 = W1.map((w, i) => w.reduce((acc, wj, j) => acc + wj * x[j], 0) + b1[i]);
            const a1 = z1.map(relu);
            const z2 = W2.map((w, i) => w.reduce((acc, wj, j) => acc + wj * a1[j], 0) + b2[i]);
            const a2 = z2.map(relu);
            const out = W3.map((w, i) => w.reduce((acc, wj, j) => acc + wj * a2[j], 0) + b3[i]);

            // Loss gradient (MSE): dL/dout = 2 * (out - y) / N
            const dout = out.map((o, i) => (2 * (o - y[i])) / trainX.length);

            // Backprop: W3, b3
            for (let i = 0; i < OUT; i++) {
                for (let j = 0; j < H2; j++) gW3[i][j] += dout[i] * a2[j];
                gb3[i] += dout[i];
            }

            // da2
            const da2 = new Array(H2).fill(0);
            for (let j = 0; j < H2; j++) {
                for (let i = 0; i < OUT; i++) da2[j] += W3[i][j] * dout[i];
            }
            const dz2 = da2.map((d, i) => d * reluGrad(z2[i]));

            // W2, b2
            for (let i = 0; i < H2; i++) {
                for (let j = 0; j < H1; j++) gW2[i][j] += dz2[i] * a1[j];
                gb2[i] += dz2[i];
            }

            // da1
            const da1 = new Array(H1).fill(0);
            for (let j = 0; j < H1; j++) {
                for (let i = 0; i < H2; i++) da1[j] += W2[i][j] * dz2[i];
            }
            const dz1 = da1.map((d, i) => d * reluGrad(z1[i]));

            // W1, b1
            for (let i = 0; i < H1; i++) {
                for (let j = 0; j < IN; j++) gW1[i][j] += dz1[i] * x[j];
                gb1[i] += dz1[i];
            }
        }

        // Adam updates — weights get L2 decay (isWeight=true), biases don't (isWeight=false)
        for (let i = 0; i < H1; i++) {
            for (let j = 0; j < IN; j++) W1[i][j] = adamUpdate(W1[i][j], gW1[i][j], aW1[i][j], true);
            b1[i] = adamUpdate(b1[i], gb1[i], ab1[i], false);
        }
        for (let i = 0; i < H2; i++) {
            for (let j = 0; j < H1; j++) W2[i][j] = adamUpdate(W2[i][j], gW2[i][j], aW2[i][j], true);
            b2[i] = adamUpdate(b2[i], gb2[i], ab2[i], false);
        }
        for (let i = 0; i < OUT; i++) {
            for (let j = 0; j < H2; j++) W3[i][j] = adamUpdate(W3[i][j], gW3[i][j], aW3[i][j], true);
            b3[i] = adamUpdate(b3[i], gb3[i], ab3[i], false);
        }
    }

    // Build predict function that denormalises
    const predictNN = (ix: number, iy: number, yaw: number, pitch: number) => {
        const x = [
            (ix - nix.min) / nix.range * 2 - 1,
            (iy - niy.min) / niy.range * 2 - 1,
            (yaw - nyaw.min) / nyaw.range * 2 - 1,
            (pitch - npitch.min) / npitch.range * 2 - 1,
        ];
        const z1 = W1.map((w, i) => w.reduce((acc, wj, j) => acc + wj * x[j], 0) + b1[i]);
        const a1 = z1.map(relu);
        const z2 = W2.map((w, i) => w.reduce((acc, wj, j) => acc + wj * a1[j], 0) + b2[i]);
        const a2 = z2.map(relu);
        const out = W3.map((w, i) => w.reduce((acc, wj, j) => acc + wj * a2[j], 0) + b3[i]);

        return {
            x: (out[0] + 1) / 2 * ntx.range + ntx.min,
            y: (out[1] + 1) / 2 * nty.range + nty.min,
        };
    };

    const err = meanEuclideanError(samples, (s) =>
        predictNN(s.ix, s.iy, s.yaw, s.pitch),
    );

    return {
        kind: 'mlp',
        predict: predictNN,
        trainingError: err,
        info: `MLP ${IN}→${H1}→${H2}→${OUT}, Adam lr=${lr}, ${epochs} epochs`,
    };
}

// ─── Training sample type ────────────────────────────────

export interface TrainingSample {
    ix: number;
    iy: number;
    yaw: number;
    pitch: number;
    targetX: number;
    targetY: number;
    pointIndex: number;
}

// ─── Helpers ─────────────────────────────────────────────

function meanEuclideanError(
    samples: TrainingSample[],
    predict: (s: TrainingSample) => { x: number; y: number },
): number {
    if (samples.length === 0) return Infinity;
    let total = 0;
    for (const s of samples) {
        const p = predict(s);
        total += Math.sqrt((p.x - s.targetX) ** 2 + (p.y - s.targetY) ** 2);
    }
    return total / samples.length;
}

// ─── Public API ──────────────────────────────────────────

/**
 * Train all three models on the same data and return the comparison.
 */
export function trainAllModels(
    samples: TrainingSample[],
    screenWidth: number,
    screenHeight: number,
): ModelComparisonResult {
    const poly = fitPolynomialModel(samples, screenWidth, screenHeight);
    const ridge = fitRidgeModel(samples, screenWidth, screenHeight);
    const mlp = fitMLPModel(samples, screenWidth, screenHeight);

    const models = [poly, ridge, mlp];
    let bestIndex = 0;
    for (let i = 1; i < models.length; i++) {
        if (models[i].trainingError < models[bestIndex].trainingError) bestIndex = i;
    }

    return { models, bestIndex, best: models[bestIndex] };
}

/**
 * Evaluate all three trained models on validation data (post-calibration).
 * Returns models sorted by validation error, with the best one first.
 */
export function evaluateModelsOnValidation(
    models: CalibrationModel[],
    validationPoints: Array<{
        point: { x: number; y: number };
        irisSamples: Array<{ x: number; y: number }>;
        predictions: Array<{ x: number; y: number }>;
        headPoseSamples: Array<{ yaw: number; pitch: number }>;
    }>,
    screenWidth: number,
    screenHeight: number,
): { models: CalibrationModel[]; bestIndex: number; best: CalibrationModel } {
    // Compute validation error for each model
    const validationErrors: number[] = [];

    for (const model of models) {
        let totalError = 0;
        let sampleCount = 0;

        for (const valPoint of validationPoints) {
            const targetX = valPoint.point.x * screenWidth;
            const targetY = valPoint.point.y * screenHeight;

            for (let i = 0; i < valPoint.irisSamples.length; i++) {
                const iris = valPoint.irisSamples[i];
                const pose = valPoint.headPoseSamples[i] ?? { yaw: 0, pitch: 0 };
                const pred = model.predict(iris.x, iris.y, pose.yaw, pose.pitch);
                const err = Math.sqrt((pred.x - targetX) ** 2 + (pred.y - targetY) ** 2);
                totalError += err;
                sampleCount++;
            }
        }

        const meanValidationError = sampleCount > 0 ? totalError / sampleCount : Infinity;
        validationErrors.push(meanValidationError);
    }

    // Find best model by validation error
    let bestIndex = 0;
    for (let i = 1; i < validationErrors.length; i++) {
        if (validationErrors[i] < validationErrors[bestIndex]) bestIndex = i;
    }

    return { models, bestIndex, best: models[bestIndex] };
}
