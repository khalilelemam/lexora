import 'server-only';

import { ZipArchive } from 'archiver';
import type { Archiver } from 'archiver';
import { PassThrough } from 'node:stream';

import {
  createAttemptBlobContainerClient,
  downloadAttemptBuffer,
  downloadAttemptJson,
  downloadAttemptStream,
} from '@/features/test/server/attempt-blob-storage';
import {
  markAttemptExportArtifactFailed,
  markAttemptExportArtifactReady,
} from '@/features/test/server/test-attempt-repository';
import type { AttemptFilters } from '@/features/attempts/types';

import { streamExportAttempts } from './export-repository';
import type { ExportAttemptRow, ExportContentMode } from './export-types';
import {
  generateAttemptExportArtifacts,
  type ExportArtifactFile,
  type ExportArtifactManifest,
} from './export-artifacts';
import { fromPrismaCalibrationMode, fromPrismaOutcome, fromPrismaTestMode } from '../shared-sql';

export interface ExportOptions {
  filters: AttemptFilters;
  include: ExportContentMode;
  includeVisuals: boolean;
}

interface SkippedAttempt {
  attemptId: string;
  reason: string;
}

/**
 * Builds a ZIP archive from precomputed per-attempt export artifacts.
 *
 * The export request now does only lightweight orchestration: stream attempt
 * rows, read each manifest, and append the matching Azure Blob streams.
 */
export function buildExportZipStream(options: ExportOptions): PassThrough {
  const output = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 6 } });

  archive.pipe(output);

  void runExportPipeline(archive, options).catch((error) => {
    console.error('[export-zip] pipeline error', error);
    archive.abort();
    output.destroy(error instanceof Error ? error : new Error(String(error)));
  });

  return output;
}

const CONCURRENCY = 6;
const SCREENSHOT_KEYS = {
  tobii: ['syllables', 'pseudo', 'meaningful'],
  webcam: ['paragraph'],
} as const;

async function runExportPipeline(
  archive: Archiver,
  { filters, include, includeVisuals }: ExportOptions,
): Promise<void> {
  const containerClient = createAttemptBlobContainerClient();
  const skipped: SkippedAttempt[] = [];

  for await (const batch of streamExportAttempts(filters)) {
    await processWithConcurrency(batch, CONCURRENCY, async (row) => {
      try {
        const manifest = await loadOrCreateManifest(row, containerClient);
        await appendManifestFiles(
          archive,
          containerClient,
          manifest,
          row,
          include,
          includeVisuals,
          skipped,
        );
      } catch (error) {
        skipped.push({
          attemptId: row.attempt_id,
          reason: error instanceof Error ? error.message : String(error),
        });
        console.warn(`[export-zip] skipping export artifacts for ${row.attempt_id}`, error);
      }
    });
  }

  if (skipped.length > 0) {
    archive.append(JSON.stringify({ skipped }, null, 2), { name: 'export-skipped.json' });
  }

  await archive.finalize();
}

async function loadOrCreateManifest(
  row: ExportAttemptRow,
  containerClient: ReturnType<typeof createAttemptBlobContainerClient>,
): Promise<ExportArtifactManifest> {
  if (row.export_artifact_status === 'READY' && row.export_manifest_path) {
    return (await downloadAttemptJson(
      containerClient,
      row.export_manifest_path,
    )) as ExportArtifactManifest;
  }

  try {
    const result = await generateArtifactsFromStoredBlobs(row, containerClient);
    await markAttemptExportArtifactReady(row.attempt_id, result.manifestPath);
    return (await downloadAttemptJson(
      containerClient,
      result.manifestPath,
    )) as ExportArtifactManifest;
  } catch (error) {
    await markAttemptExportArtifactFailed(row.attempt_id, error);
    throw error;
  }
}

async function generateArtifactsFromStoredBlobs(
  row: ExportAttemptRow,
  containerClient: ReturnType<typeof createAttemptBlobContainerClient>,
) {
  const attemptId = row.attempt_id;
  const testType = fromPrismaTestMode(row.test_type);
  const derivedPayload = await downloadAttemptJson(containerClient, `derived/${attemptId}.json`);
  const rawPayload =
    row.raw_data_consented && row.raw_blob_url
      ? await downloadOptionalJson(containerClient, `raw/${attemptId}.json`)
      : undefined;

  return generateAttemptExportArtifacts({
    attemptId,
    testType,
    outcome: fromPrismaOutcome(row.outcome),
    modelVersion: row.model_version,
    calibrationMode: fromPrismaCalibrationMode(row.calibration_mode),
    age: row.age,
    label: row.label,
    rawDataConsented: row.raw_data_consented,
    rawPayload,
    derivedPayload,
    screenshotBuffers: await downloadScreenshotBuffers(
      containerClient,
      attemptId,
      SCREENSHOT_KEYS[testType],
    ),
    submittedAt: new Date(row.created_at),
  });
}

async function downloadOptionalJson(
  containerClient: ReturnType<typeof createAttemptBlobContainerClient>,
  path: string,
) {
  try {
    return await downloadAttemptJson(containerClient, path);
  } catch (error) {
    if (isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
}

async function downloadScreenshotBuffers(
  containerClient: ReturnType<typeof createAttemptBlobContainerClient>,
  attemptId: string,
  taskKeys: readonly string[],
) {
  const screenshots: Record<string, Buffer> = {};

  await Promise.all(
    taskKeys.map(async (taskKey) => {
      const buffer = await downloadAttemptBuffer(
        containerClient,
        `screenshots/${attemptId}_${taskKey}.jpg`,
      );
      if (buffer) {
        screenshots[taskKey] = buffer;
      }
    }),
  );

  return screenshots;
}

async function appendManifestFiles(
  archive: Archiver,
  containerClient: ReturnType<typeof createAttemptBlobContainerClient>,
  manifest: ExportArtifactManifest,
  row: ExportAttemptRow,
  include: ExportContentMode,
  includeVisuals: boolean,
  skipped: SkippedAttempt[],
) {
  for (const file of selectManifestFiles(manifest.files, include, includeVisuals, row)) {
    const stream = await downloadAttemptStream(containerClient, file.blobPath);
    if (!stream) {
      skipped.push({
        attemptId: row.attempt_id,
        reason: `missing export artifact blob: ${file.blobPath}`,
      });
      continue;
    }

    archive.append(stream, { name: file.zipPath });
  }
}

function selectManifestFiles(
  files: ExportArtifactFile[],
  include: ExportContentMode,
  includeVisuals: boolean,
  row: ExportAttemptRow,
) {
  return files.filter((file) => {
    if (file.content === 'raw' && (!row.raw_data_consented || !row.raw_blob_url)) {
      return false;
    }

    if (file.content === 'raw' && include === 'derived') {
      return false;
    }

    if (file.content === 'derived' && include === 'raw') {
      return false;
    }

    if (file.visual && !includeVisuals) {
      return false;
    }

    return true;
  });
}

function isNotFoundError(error: unknown) {
  return (
    error instanceof Object &&
    'statusCode' in error &&
    (error as { statusCode: number }).statusCode === 404
  );
}

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
