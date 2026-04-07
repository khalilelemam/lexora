export interface TrainingSample {
    ix: number;
    iy: number;
    yaw: number;
    pitch: number;
    targetX: number;
    targetY: number;
    pointIndex: number;
}
export type ModelKind = 'kernel-ridge-rbf';

export interface CalibrationModel {
    kind: ModelKind;
    predict: (irisX: number, irisY: number, yaw: number, pitch: number) => { x: number; y: number };
    trainingError: number;
    info: string;
}

type Vec4 = [number, number, number, number];

interface FeatureScaler {
    mean: Vec4;
    std: Vec4;
}

function normalizeInput(v: Vec4, scaler: FeatureScaler): Vec4 {
    return [
        (v[0] - scaler.mean[0]) / scaler.std[0],
        (v[1] - scaler.mean[1]) / scaler.std[1],
        (v[2] - scaler.mean[2]) / scaler.std[2],
        (v[3] - scaler.mean[3]) / scaler.std[3],
    ];
}

function fitScaler(inputs: Vec4[]): FeatureScaler {
    const mean: Vec4 = [0, 0, 0, 0];
    const std: Vec4 = [1, 1, 1, 1];
    if (inputs.length === 0) return { mean, std };

    for (const v of inputs) {
        mean[0] += v[0];
        mean[1] += v[1];
        mean[2] += v[2];
        mean[3] += v[3];
    }
    mean[0] /= inputs.length;
    mean[1] /= inputs.length;
    mean[2] /= inputs.length;
    mean[3] /= inputs.length;

    for (const v of inputs) {
        std[0] += (v[0] - mean[0]) ** 2;
        std[1] += (v[1] - mean[1]) ** 2;
        std[2] += (v[2] - mean[2]) ** 2;
        std[3] += (v[3] - mean[3]) ** 2;
    }

    std[0] = Math.max(1e-6, Math.sqrt(std[0] / inputs.length));
    std[1] = Math.max(1e-6, Math.sqrt(std[1] / inputs.length));
    std[2] = Math.max(1e-6, Math.sqrt(std[2] / inputs.length));
    std[3] = Math.max(1e-6, Math.sqrt(std[3] / inputs.length));

    return { mean, std };
}

function squaredDistance(a: Vec4, b: Vec4): number {
    const d0 = a[0] - b[0];
    const d1 = a[1] - b[1];
    const d2 = a[2] - b[2];
    const d3 = a[3] - b[3];
    return d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3;
}

function estimateGamma(inputs: Vec4[]): number {
    if (inputs.length < 2) return 1;
    const distances: number[] = [];
    const stride = Math.max(1, Math.floor(inputs.length / 40));

    for (let i = 0; i < inputs.length; i += stride) {
        for (let j = i + stride; j < inputs.length; j += stride) {
            distances.push(squaredDistance(inputs[i], inputs[j]));
            if (distances.length >= 200) break;
        }
        if (distances.length >= 200) break;
    }

    if (distances.length === 0) return 1;
    distances.sort((x, y) => x - y);
    const median = distances[Math.floor(distances.length / 2)] || 1;
    return 1 / (2 * median);
}

function buildFeatureVector(input: Vec4, anchors: Vec4[], gamma: number): number[] {
    const linear = [1, input[0], input[1], input[2], input[3]];
    const kernels = anchors.map((c) => Math.exp(-gamma * squaredDistance(input, c)));
    return [...linear, ...kernels];
}

function solveRidge(A: number[][], b: number[], lambda: number, unregularizedCols: number): number[] {
    const cols = A[0]?.length ?? 0;
    const n = A.length;
    if (cols === 0 || n === 0) return new Array(cols).fill(0);

    const ATA: number[][] = Array.from({ length: cols }, () => new Array(cols).fill(0));
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < cols; j++) {
            let s = 0;
            for (let k = 0; k < n; k++) s += A[k][i] * A[k][j];
            ATA[i][j] = s;
        }
        if (i >= unregularizedCols) ATA[i][i] += lambda;
    }

    const ATb: number[] = new Array(cols).fill(0);
    for (let i = 0; i < cols; i++) {
        let s = 0;
        for (let k = 0; k < n; k++) s += A[k][i] * b[k];
        ATb[i] = s;
    }

    const aug: number[][] = ATA.map((row, i) => [...row, ATb[i]]);
    for (let col = 0; col < cols; col++) {
        let pivotRow = col;
        for (let row = col + 1; row < cols; row++) {
            if (Math.abs(aug[row][col]) > Math.abs(aug[pivotRow][col])) pivotRow = row;
        }
        [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
        const pivot = aug[col][col];
        if (Math.abs(pivot) < 1e-12) continue;
        for (let j = col; j <= cols; j++) aug[col][j] /= pivot;
        for (let row = 0; row < cols; row++) {
            if (row === col) continue;
            const factor = aug[row][col];
            for (let j = col; j <= cols; j++) aug[row][j] -= factor * aug[col][j];
        }
    }
    return aug.map((r) => r[cols]);
}

function predictLinear(coeffs: number[], features: number[]): number {
    let sum = 0;
    for (let i = 0; i < coeffs.length; i++) sum += coeffs[i] * features[i];
    return sum;
}

function meanEuclideanError(
    samples: TrainingSample[],
    predict: (s: TrainingSample) => { x: number; y: number },
): number {
    if (samples.length === 0) return Number.POSITIVE_INFINITY;
    let total = 0;
    for (const s of samples) {
        const p = predict(s);
        total += Math.hypot(p.x - s.targetX, p.y - s.targetY);
    }
    return total / samples.length;
}

function takeEvenly<T>(arr: T[], count: number): T[] {
    if (arr.length <= count) return [...arr];
    const step = (arr.length - 1) / Math.max(1, count - 1);
    return Array.from({ length: count }, (_, i) => arr[Math.round(i * step)]);
}

function fitKernelRidge(
    train: TrainingSample[],
    validation: TrainingSample[],
): CalibrationModel {
    const trainInputsRaw: Vec4[] = train.map((s) => [s.ix, s.iy, s.yaw, s.pitch]);
    const scaler = fitScaler(trainInputsRaw);
    const trainInputs = trainInputsRaw.map((v) => normalizeInput(v, scaler));

    const maxAnchors = Math.min(56, trainInputs.length);
    const anchorCandidates = [20, 32, 44, 56]
        .map((x) => Math.min(x, maxAnchors))
        .filter((x, i, arr) => x > 0 && arr.indexOf(x) === i);

    const baseGamma = estimateGamma(trainInputs);
    const gammaCandidates = [0.5, 1, 2, 4].map((m) => baseGamma * m);
    const lambdaCandidates = [1e-4, 1e-3, 1e-2, 1e-1, 1];

    const selector = validation.length > 0 ? validation : train;
    let bestConfig: {
        anchors: Vec4[];
        gamma: number;
        lambda: number;
        xCoeffs: number[];
        yCoeffs: number[];
        error: number;
    } | null = null;

    for (const anchorCount of anchorCandidates) {
        const anchors = takeEvenly(trainInputs, anchorCount);
        for (const gamma of gammaCandidates) {
            const A = trainInputs.map((input) => buildFeatureVector(input, anchors, gamma));
            const bx = train.map((s) => s.targetX);
            const by = train.map((s) => s.targetY);

            for (const lambda of lambdaCandidates) {
                const xCoeffs = solveRidge(A, bx, lambda, 5);
                const yCoeffs = solveRidge(A, by, lambda, 5);
                const err = meanEuclideanError(selector, (s) => {
                    const normalized = normalizeInput([s.ix, s.iy, s.yaw, s.pitch], scaler);
                    const f = buildFeatureVector(normalized, anchors, gamma);
                    return { x: predictLinear(xCoeffs, f), y: predictLinear(yCoeffs, f) };
                });

                if (!bestConfig || err < bestConfig.error) {
                    bestConfig = { anchors, gamma, lambda, xCoeffs, yCoeffs, error: err };
                }
            }
        }
    }

    if (!bestConfig) {
        return {
            kind: 'kernel-ridge-rbf',
            predict: () => ({ x: 0, y: 0 }),
            trainingError: Number.POSITIVE_INFINITY,
            info: 'RBF kernel ridge (fallback)',
        };
    }

    const predict = (ix: number, iy: number, yaw: number, pitch: number) => {
        const normalized = normalizeInput([ix, iy, yaw, pitch], scaler);
        const f = buildFeatureVector(normalized, bestConfig.anchors, bestConfig.gamma);
        return {
            x: predictLinear(bestConfig.xCoeffs, f),
            y: predictLinear(bestConfig.yCoeffs, f),
        };
    };

    const trainingError = meanEuclideanError(train, (s) =>
        predict(s.ix, s.iy, s.yaw, s.pitch),
    );

    return {
        kind: 'kernel-ridge-rbf',
        predict,
        trainingError,
        info:
            `Kernel ridge (RBF), anchors=${bestConfig.anchors.length}, ` +
            `gamma=${bestConfig.gamma.toExponential(2)}, lambda=${bestConfig.lambda}`,
    };
}

export function fitProductionCalibrationModel(
    samples: TrainingSample[],
    validationSamples: TrainingSample[] = [],
): CalibrationModel {
    if (samples.length < 8) {
        return {
            kind: 'kernel-ridge-rbf',
            predict: () => ({ x: 0, y: 0 }),
            trainingError: Number.POSITIVE_INFINITY,
            info: 'Kernel ridge (insufficient samples)',
        };
    }
    return fitKernelRidge(samples, validationSamples);
}
