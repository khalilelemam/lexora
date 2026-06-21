import 'server-only';

import {
  createAttemptBlobContainerClient,
  ensureAttemptBlobContainer,
  uploadAttemptBuffer,
  uploadAttemptJson,
  uploadAttemptText,
} from '@/features/test/server/attempt-blob-storage';
import type {
  AttemptContentSnapshot,
  CalibrationMode,
  RiskLevel,
  TestMode,
} from '@/features/test/types';
import type { GazeFeature } from '@/features/test/types';

import { featuresToCsv, rawTobiiGazeToCsv, rawWebcamGazeToCsv } from './export-csv';
import { compositeGazeVisualization } from './export-visualization';
import { TOBII_FEATURE_KEY_MAP, TOBII_RAW_KEY_MAP } from './export-types';

const CSV_CONTENT_TYPE = 'text/csv; charset=utf-8';
const PNG_CONTENT_TYPE = 'image/png';

export interface ExportArtifactFile {
  blobPath: string;
  zipPath: string;
  content: 'derived' | 'raw';
  visual: boolean;
}

export interface ExportArtifactManifest {
  manifestSchema: 1;
  attemptId: string;
  generatedAt: string;
  files: ExportArtifactFile[];
}

export interface GenerateAttemptExportArtifactsParams {
  attemptId: string;
  testType: TestMode;
  outcome: RiskLevel;
  modelVersion: string;
  calibrationMode: CalibrationMode;
  age: number;
  label: string;
  rawDataConsented: boolean;
  rawPayload?: unknown;
  derivedPayload: unknown;
  contentSnapshot?: AttemptContentSnapshot;
  screenshots?: Record<string, string>;
  submittedAt: Date;
}

export interface GenerateAttemptExportArtifactsResult {
  manifestPath: string;
}

interface DerivedFeatureRow {
  timestamp: number;
  durationMs: number;
  fixationX: number;
  fixationY: number;
  saccadeAmplitude: number;
  efficiencyRatio?: number;
  saccadeVelocity?: number;
  isRegression?: boolean;
  isReturnSweep?: boolean;
}

interface StoredDerivedPayload {
  mlResponse: {
    dyslexiaProbability: number;
    riskLevel: string;
    confidence: number;
    metadata?: { sequencesAnalyzed?: number; totalFixations?: number };
    features?: DerivedFeatureRow[] | Record<string, DerivedFeatureRow[]>;
  };
  contentSnapshot?: AttemptContentSnapshot;
}

interface TobiiRawPayload {
  syllablesTask?: { gazePoints?: TobiiRawPoint[]; normalizedLineCenters?: number[] };
  meaningfulTask?: { gazePoints?: TobiiRawPoint[]; normalizedLineCenters?: number[] };
  pseudoTask?: { gazePoints?: TobiiRawPoint[]; normalizedLineCenters?: number[] };
  screenWidth: number;
  screenHeight: number;
}

interface TobiiRawPoint {
  fixationX: number;
  fixationY: number;
  timestamp: number;
}

interface WebcamRawPayload {
  gazeData?: WebcamRawPoint[];
  screenWidth: number;
  screenHeight: number;
  normalizedLineCenters?: number[];
}

interface WebcamRawPoint {
  x: number;
  y: number;
  timestamp: number;
}

export async function generateAttemptExportArtifacts(
  params: GenerateAttemptExportArtifactsParams,
): Promise<GenerateAttemptExportArtifactsResult> {
  const containerClient = createAttemptBlobContainerClient();
  await ensureAttemptBlobContainer(containerClient);

  const basePath = `exports/${params.attemptId}`;
  const files: ExportArtifactFile[] = [];
  const screenshots = decodeScreenshots(params.screenshots);
  const derived = normalizeDerivedPayload(params.derivedPayload, params.contentSnapshot);

  await uploadDerivedArtifacts({
    containerClient,
    basePath,
    files,
    params,
    derived,
    screenshots,
  });

  if (params.rawDataConsented && typeof params.rawPayload !== 'undefined') {
    await uploadRawArtifacts({
      containerClient,
      basePath,
      files,
      attemptId: params.attemptId,
      testType: params.testType,
      rawPayload: params.rawPayload,
    });
  }

  const manifestPath = `${basePath}/manifest.json`;
  const manifest: ExportArtifactManifest = {
    manifestSchema: 1,
    attemptId: params.attemptId,
    generatedAt: new Date().toISOString(),
    files,
  };

  await uploadAttemptJson(containerClient, manifestPath, manifest);

  return { manifestPath };
}

async function uploadDerivedArtifacts({
  containerClient,
  basePath,
  files,
  params,
  derived,
  screenshots,
}: {
  containerClient: ReturnType<typeof createAttemptBlobContainerClient>;
  basePath: string;
  files: ExportArtifactFile[];
  params: GenerateAttemptExportArtifactsParams;
  derived: StoredDerivedPayload;
  screenshots: Map<string, Buffer>;
}) {
  const prefix = `derived/${params.attemptId}`;
  const ml = derived.mlResponse;
  const metadata = {
    attemptId: params.attemptId,
    testType: params.testType,
    outcome: params.outcome,
    dyslexiaProbability: ml.dyslexiaProbability,
    confidence: ml.confidence,
    modelVersion: params.modelVersion,
    calibrationMode: params.calibrationMode,
    age: params.age,
    label: params.label,
    sequencesAnalyzed: ml.metadata?.sequencesAnalyzed,
    totalFixations: ml.metadata?.totalFixations,
    contentSnapshot: derived.contentSnapshot ?? null,
    createdAt: params.submittedAt.toISOString(),
  };

  await uploadJsonArtifact({
    containerClient,
    files,
    blobPath: `${basePath}/derived/metadata.json`,
    zipPath: `${prefix}/metadata.json`,
    content: 'derived',
    data: metadata,
  });

  const features = ml.features;
  if (!features) return;

  if (params.testType === 'webcam' && Array.isArray(features)) {
    const gazeFeatures = toGazeFeatures(features);
    await uploadCsvArtifact({
      containerClient,
      files,
      blobPath: `${basePath}/derived/features_paragraph.csv`,
      zipPath: `${prefix}/features_paragraph.csv`,
      content: 'derived',
      csv: featuresToCsv(gazeFeatures),
    });

    await uploadVisualizationArtifact({
      containerClient,
      files,
      screenshots,
      taskKey: 'paragraph',
      gazeFeatures,
      blobPath: `${basePath}/derived/gaze_paragraph.png`,
      zipPath: `${prefix}/gaze_paragraph.png`,
    });
  } else if (params.testType === 'tobii' && !Array.isArray(features)) {
    for (const [featureKey, taskKey] of Object.entries(TOBII_FEATURE_KEY_MAP)) {
      const taskFeatures = features[featureKey];
      if (!taskFeatures?.length) continue;

      const gazeFeatures = toGazeFeatures(taskFeatures);
      await uploadCsvArtifact({
        containerClient,
        files,
        blobPath: `${basePath}/derived/features_${taskKey}.csv`,
        zipPath: `${prefix}/features_${taskKey}.csv`,
        content: 'derived',
        csv: featuresToCsv(gazeFeatures),
      });

      await uploadVisualizationArtifact({
        containerClient,
        files,
        screenshots,
        taskKey,
        gazeFeatures,
        blobPath: `${basePath}/derived/gaze_${taskKey}.png`,
        zipPath: `${prefix}/gaze_${taskKey}.png`,
      });
    }
  }
}

async function uploadRawArtifacts({
  containerClient,
  basePath,
  files,
  attemptId,
  testType,
  rawPayload,
}: {
  containerClient: ReturnType<typeof createAttemptBlobContainerClient>;
  basePath: string;
  files: ExportArtifactFile[];
  attemptId: string;
  testType: TestMode;
  rawPayload: unknown;
}) {
  const prefix = `raw/${attemptId}`;

  if (testType === 'webcam') {
    const payload = rawPayload as WebcamRawPayload;
    await uploadJsonArtifact({
      containerClient,
      files,
      blobPath: `${basePath}/raw/metadata.json`,
      zipPath: `${prefix}/metadata.json`,
      content: 'raw',
      data: {
        attemptId,
        screenWidth: payload.screenWidth,
        screenHeight: payload.screenHeight,
        normalizedLineCenters: payload.normalizedLineCenters,
      },
    });

    if (payload.gazeData?.length) {
      await uploadCsvArtifact({
        containerClient,
        files,
        blobPath: `${basePath}/raw/gaze_paragraph.csv`,
        zipPath: `${prefix}/gaze_paragraph.csv`,
        content: 'raw',
        csv: rawWebcamGazeToCsv(payload.gazeData),
      });
    }

    return;
  }

  const payload = rawPayload as TobiiRawPayload;
  await uploadJsonArtifact({
    containerClient,
    files,
    blobPath: `${basePath}/raw/metadata.json`,
    zipPath: `${prefix}/metadata.json`,
    content: 'raw',
    data: {
      attemptId,
      screenWidth: payload.screenWidth,
      screenHeight: payload.screenHeight,
    },
  });

  for (const [rawKey, taskKey] of Object.entries(TOBII_RAW_KEY_MAP)) {
    const task = getTobiiRawTask(payload, rawKey);
    if (!task?.gazePoints?.length) continue;

    await uploadCsvArtifact({
      containerClient,
      files,
      blobPath: `${basePath}/raw/gaze_${taskKey}.csv`,
      zipPath: `${prefix}/gaze_${taskKey}.csv`,
      content: 'raw',
      csv: rawTobiiGazeToCsv(task.gazePoints),
    });
  }
}

async function uploadJsonArtifact({
  containerClient,
  files,
  blobPath,
  zipPath,
  content,
  data,
}: {
  containerClient: ReturnType<typeof createAttemptBlobContainerClient>;
  files: ExportArtifactFile[];
  blobPath: string;
  zipPath: string;
  content: 'derived' | 'raw';
  data: unknown;
}) {
  await uploadAttemptJson(containerClient, blobPath, data);
  files.push({ blobPath, zipPath, content, visual: false });
}

async function uploadCsvArtifact({
  containerClient,
  files,
  blobPath,
  zipPath,
  content,
  csv,
}: {
  containerClient: ReturnType<typeof createAttemptBlobContainerClient>;
  files: ExportArtifactFile[];
  blobPath: string;
  zipPath: string;
  content: 'derived' | 'raw';
  csv: string;
}) {
  await uploadAttemptText(containerClient, blobPath, csv, CSV_CONTENT_TYPE);
  files.push({ blobPath, zipPath, content, visual: false });
}

async function uploadVisualizationArtifact({
  containerClient,
  files,
  screenshots,
  taskKey,
  gazeFeatures,
  blobPath,
  zipPath,
}: {
  containerClient: ReturnType<typeof createAttemptBlobContainerClient>;
  files: ExportArtifactFile[];
  screenshots: Map<string, Buffer>;
  taskKey: string;
  gazeFeatures: GazeFeature[];
  blobPath: string;
  zipPath: string;
}) {
  if (gazeFeatures.length === 0) return;

  const screenshot = screenshots.get(taskKey);
  if (!screenshot) return;

  const png = await compositeGazeVisualization(gazeFeatures, screenshot);
  if (!png) return;

  await uploadAttemptBuffer(containerClient, blobPath, png, PNG_CONTENT_TYPE);
  files.push({ blobPath, zipPath, content: 'derived', visual: true });
}

function normalizeDerivedPayload(
  derivedPayload: unknown,
  contentSnapshot: AttemptContentSnapshot | undefined,
): StoredDerivedPayload {
  if (
    derivedPayload &&
    typeof derivedPayload === 'object' &&
    'mlResponse' in derivedPayload &&
    (derivedPayload as { mlResponse?: unknown }).mlResponse
  ) {
    return derivedPayload as StoredDerivedPayload;
  }

  return {
    mlResponse: derivedPayload as StoredDerivedPayload['mlResponse'],
    contentSnapshot,
  };
}

function decodeScreenshots(screenshots: Record<string, string> | undefined) {
  const decoded = new Map<string, Buffer>();

  for (const [taskKey, dataUrl] of Object.entries(screenshots ?? {})) {
    const buffer = decodeImageDataUrl(dataUrl);
    if (buffer) {
      decoded.set(normalizeScreenshotKey(taskKey), buffer);
    }
  }

  return decoded;
}

function decodeImageDataUrl(dataUrl: string): Buffer | null {
  const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  return match ? Buffer.from(match[1], 'base64') : null;
}

const SCREENSHOT_KEY_MAP: Record<string, string> = {
  'pseudo-words': 'pseudo',
  'meaningful-text': 'meaningful',
};

function normalizeScreenshotKey(taskKey: string): string {
  return SCREENSHOT_KEY_MAP[taskKey] ?? taskKey;
}

function toGazeFeatures(rows: DerivedFeatureRow[]): GazeFeature[] {
  return rows.map((row, i, all) => ({
    timestamp: row.timestamp,
    durationMs: row.durationMs,
    fixationX: row.fixationX,
    fixationY: row.fixationY,
    saccadeAmplitude: row.saccadeAmplitude,
    efficiencyRatio: row.efficiencyRatio,
    isRegression: row.isRegression ?? (i > 0 ? row.fixationX < all[i - 1].fixationX : false),
    isReturnSweep:
      row.isReturnSweep ??
      (i > 0
        ? row.fixationY > all[i - 1].fixationY + 0.03 && row.fixationX < all[i - 1].fixationX
        : false),
  }));
}

function getTobiiRawTask(payload: TobiiRawPayload, key: string) {
  switch (key) {
    case 'syllablesTask':
      return payload.syllablesTask;
    case 'meaningfulTask':
      return payload.meaningfulTask;
    case 'pseudoTask':
      return payload.pseudoTask;
    default:
      return undefined;
  }
}
