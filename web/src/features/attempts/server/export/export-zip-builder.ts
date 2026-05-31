import 'server-only';

import { Archiver, ZipArchive } from 'archiver';
import { PassThrough } from 'node:stream';

import {
  createAttemptBlobContainerClient,
  downloadAttemptJson,
  downloadAttemptBuffer,
} from '@/features/test/server/attempt-blob-storage';
import type { GazeFeature } from '@/features/test/types';
import type { AttemptFilters } from '@/features/attempts/types';
import {
  fromPrismaCalibrationMode,
  fromPrismaOutcome,
  fromPrismaTestMode,
} from '@/features/attempts/server/shared-sql';

import { featuresToCsv, rawTobiiGazeToCsv, rawWebcamGazeToCsv } from './export-csv';
import { streamExportAttempts } from './export-repository';
import type { ExportAttemptRow, ExportContentMode } from './export-types';
import { TOBII_FEATURE_KEY_MAP, TOBII_RAW_KEY_MAP } from './export-types';
import { compositeGazeVisualization } from './export-visualization';

// ── Derived blob shape ──────────────────────────────────────

interface DerivedFeatureRow {
  timestamp: number;
  durationMs: number;
  fixationX: number;
  fixationY: number;
  saccadeAmplitude: number;
  saccadeVelocity?: number;
  isRegression?: boolean;
  isReturnSweep?: boolean;
}

interface StoredDerivedPayload {
  mlResponse: {
    dyslexiaProbability: number;
    riskLevel: string;
    confidence: number;
    metadata: { sequencesAnalyzed: number; totalFixations: number };
    features?: DerivedFeatureRow[] | Record<string, DerivedFeatureRow[]>;
  };
  contentSnapshot?: {
    version: number;
    primaryTask: string;
    tasks: Record<string, string>;
  };
}

// ── Raw blob shapes ─────────────────────────────────────────

interface TobiiRawPayload {
  syllablesTask: { gazePoints: TobiiRawPoint[]; normalizedLineCenters: number[] };
  meaningfulTask: { gazePoints: TobiiRawPoint[]; normalizedLineCenters: number[] };
  pseudoTask: { gazePoints: TobiiRawPoint[]; normalizedLineCenters: number[] };
  screenWidth: number;
  screenHeight: number;
}

interface TobiiRawPoint {
  fixationX: number;
  fixationY: number;
  timestamp: number;
}

interface WebcamRawPayload {
  gazeData: WebcamRawPoint[];
  screenWidth: number;
  screenHeight: number;
  normalizedLineCenters: number[];
}

interface WebcamRawPoint {
  x: number;
  y: number;
  timestamp: number;
}

// ── Public API ──────────────────────────────────────────────

export interface ExportOptions {
  filters: AttemptFilters;
  include: ExportContentMode;
  includeVisuals: boolean;
}

/**
 * Builds a ZIP archive as a readable stream, streaming attempt data
 * in batches from Azure Blob Storage.
 *
 * Returns a PassThrough stream that the API route can pipe directly
 * into the HTTP response.
 */
export function buildExportZipStream(options: ExportOptions): PassThrough {
  const output = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 6 } });

  archive.pipe(output);

  // Run the async pipeline in the background. If it fails,
  // the error is propagated to the output stream.
  void runExportPipeline(archive, options).catch((error) => {
    console.error('[export-zip] pipeline error', error);
    archive.abort();
    output.destroy(error instanceof Error ? error : new Error(String(error)));
  });

  return output;
}

// ── Internal pipeline ───────────────────────────────────────

const CONCURRENCY = 6;

async function runExportPipeline(
  archive: Archiver,
  { filters, include, includeVisuals }: ExportOptions,
): Promise<void> {
  const containerClient = createAttemptBlobContainerClient();
  const includeDerived = include === 'derived' || include === 'both';
  const includeRaw = include === 'raw' || include === 'both';

  for await (const batch of streamExportAttempts(filters)) {
    // Process each batch with bounded concurrency to parallelise
    // Azure blob downloads while keeping memory usage controlled.
    await processWithConcurrency(batch, CONCURRENCY, async (row) => {
      const attemptId = row.attempt_id;
      const testType = fromPrismaTestMode(row.test_type);

      if (includeDerived) {
        try {
          const derivedBlob = (await downloadAttemptJson(
            containerClient,
            `derived/${attemptId}.json`,
          )) as StoredDerivedPayload;

          await appendDerivedAttempt(
            archive,
            attemptId,
            row,
            derivedBlob,
            testType,
            includeVisuals,
            containerClient,
          );
        } catch (error) {
          console.warn(`[export-zip] skipping derived for ${attemptId}`, error);
        }
      }

      if (includeRaw && row.raw_data_consented && row.raw_blob_url) {
        try {
          const rawBlob = await downloadAttemptJson(containerClient, `raw/${attemptId}.json`);
          await appendRawAttempt(archive, attemptId, rawBlob, testType);
        } catch (error) {
          console.warn(`[export-zip] skipping raw for ${attemptId}`, error);
        }
      }
    });
  }

  await archive.finalize();
}

// ── Visualization helper ────────────────────────────────────

/**
 * Downloads a stored screenshot and composites the gaze overlay on top.
 * Returns null if no screenshot exists (e.g. older tests without capture).
 */
async function renderVisualizationFromScreenshot(
  containerClient: import('@azure/storage-blob').ContainerClient,
  attemptId: string,
  taskKey: string,
  features: GazeFeature[],
): Promise<Buffer | null> {
  try {
    const screenshot = await downloadAttemptBuffer(
      containerClient,
      `screenshots/${attemptId}_${taskKey}.jpg`,
    );

    if (screenshot) {
      return compositeGazeVisualization(features, screenshot);
    }
  } catch (error) {
    console.warn(`[export-zip] screenshot download failed for ${attemptId}/${taskKey}`, error);
  }

  return null;
}

// ── Derived attempt ─────────────────────────────────────────

async function appendDerivedAttempt(
  archive: Archiver,
  attemptId: string,
  row: ExportAttemptRow,
  blob: StoredDerivedPayload,
  testType: string,
  includeVisuals: boolean,
  containerClient: import('@azure/storage-blob').ContainerClient,
): Promise<void> {
  const prefix = `derived/${attemptId}`;
  const ml = blob.mlResponse;

  // metadata.json
  const metadata = {
    attemptId,
    testType,
    outcome: fromPrismaOutcome(row.outcome),
    dyslexiaProbability: ml.dyslexiaProbability,
    confidence: ml.confidence,
    modelVersion: row.model_version,
    calibrationMode: fromPrismaCalibrationMode(row.calibration_mode),
    age: row.age,
    label: row.label,
    sequencesAnalyzed: ml.metadata?.sequencesAnalyzed,
    totalFixations: ml.metadata?.totalFixations,
    contentSnapshot: blob.contentSnapshot ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  };

  archive.append(JSON.stringify(metadata, null, 2), { name: `${prefix}/metadata.json` });

  // Feature CSVs + visualization PNGs
  const features = ml.features;
  if (!features) return;

  if (testType === 'webcam' && Array.isArray(features)) {
    const gazeFeatures = toGazeFeatures(features);
    archive.append(featuresToCsv(gazeFeatures), { name: `${prefix}/features_paragraph.csv` });

    if (includeVisuals && gazeFeatures.length > 0) {
      const png = await renderVisualizationFromScreenshot(
        containerClient,
        attemptId,
        'paragraph',
        gazeFeatures,
      );
      if (png) {
        archive.append(png, { name: `${prefix}/gaze_paragraph.png` });
      }
    }
  } else if (testType === 'tobii' && !Array.isArray(features)) {
    for (const [featureKey, taskKey] of Object.entries(TOBII_FEATURE_KEY_MAP)) {
      const taskFeatures = (features as Record<string, DerivedFeatureRow[]>)[featureKey];
      if (!taskFeatures?.length) continue;

      const gazeFeatures = toGazeFeatures(taskFeatures);
      archive.append(featuresToCsv(gazeFeatures), {
        name: `${prefix}/features_${taskKey}.csv`,
      });

      if (includeVisuals && gazeFeatures.length > 0) {
        const png = await renderVisualizationFromScreenshot(
          containerClient,
          attemptId,
          taskKey,
          gazeFeatures,
        );
        if (png) {
          archive.append(png, { name: `${prefix}/gaze_${taskKey}.png` });
        }
      }
    }
  }
}

// ── Raw attempt ─────────────────────────────────────────────

async function appendRawAttempt(
  archive: Archiver,
  attemptId: string,
  blob: unknown,
  testType: string,
): Promise<void> {
  const prefix = `raw/${attemptId}`;

  if (testType === 'webcam') {
    const payload = blob as WebcamRawPayload;

    const metadata = {
      attemptId,
      screenWidth: payload.screenWidth,
      screenHeight: payload.screenHeight,
      normalizedLineCenters: payload.normalizedLineCenters,
    };
    archive.append(JSON.stringify(metadata, null, 2), { name: `${prefix}/metadata.json` });

    if (payload.gazeData?.length) {
      archive.append(rawWebcamGazeToCsv(payload.gazeData), {
        name: `${prefix}/gaze_paragraph.csv`,
      });
    }
  } else {
    const payload = blob as TobiiRawPayload;

    const metadata = {
      attemptId,
      screenWidth: payload.screenWidth,
      screenHeight: payload.screenHeight,
    };
    archive.append(JSON.stringify(metadata, null, 2), { name: `${prefix}/metadata.json` });

    for (const [rawKey, taskKey] of Object.entries(TOBII_RAW_KEY_MAP)) {
      const task = getTobiiRawTask(payload, rawKey);
      if (!task?.gazePoints?.length) continue;

      archive.append(rawTobiiGazeToCsv(task.gazePoints), {
        name: `${prefix}/gaze_${taskKey}.csv`,
      });
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Converts raw derived feature rows into the GazeFeature shape
 * used by the CSV and visualization modules.
 *
 * For eye-tracker features, isRegression and isReturnSweep are
 * computed from spatial deltas (same logic as attempt-result.ts).
 */
function toGazeFeatures(rows: DerivedFeatureRow[]): GazeFeature[] {
  return rows.map((row, i, all) => ({
    timestamp: row.timestamp,
    durationMs: row.durationMs,
    fixationX: row.fixationX,
    fixationY: row.fixationY,
    saccadeAmplitude: row.saccadeAmplitude,
    isRegression: row.isRegression ?? (i > 0 ? row.fixationX < all[i - 1].fixationX : false),
    isReturnSweep:
      row.isReturnSweep ??
      (i > 0
        ? row.fixationY > all[i - 1].fixationY + 0.03 && row.fixationX < all[i - 1].fixationX
        : false),
  }));
}

interface TobiiRawTaskData {
  gazePoints: TobiiRawPoint[];
  normalizedLineCenters: number[];
}

/**
 * Type-safe accessor for TobiiRawPayload task data by key name.
 */
function getTobiiRawTask(payload: TobiiRawPayload, key: string): TobiiRawTaskData | undefined {
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

/**
 * Processes items with bounded concurrency.
 *
 * Runs up to `limit` tasks in parallel at any given time, starting the
 * next one as soon as a slot frees up. Errors in individual items are
 * swallowed (they're already handled inside each callback with try/catch).
 */
async function processWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const current = index++;
      await fn(items[current]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
}
