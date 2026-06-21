import 'server-only';

import { ZipArchive } from 'archiver';
import type { Archiver } from 'archiver';
import { PassThrough } from 'node:stream';

import {
  createAttemptBlobContainerClient,
  downloadAttemptJson,
  downloadAttemptStream,
} from '@/features/test/server/attempt-blob-storage';
import type { AttemptFilters } from '@/features/attempts/types';

import { streamExportAttempts } from './export-repository';
import type { ExportAttemptRow, ExportContentMode } from './export-types';
import type { ExportArtifactFile, ExportArtifactManifest } from './export-artifacts';

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

async function runExportPipeline(
  archive: Archiver,
  { filters, include, includeVisuals }: ExportOptions,
): Promise<void> {
  const containerClient = createAttemptBlobContainerClient();
  const skipped: SkippedAttempt[] = [];

  for await (const batch of streamExportAttempts(filters)) {
    await processWithConcurrency(batch, CONCURRENCY, async (row) => {
      if (row.export_artifact_status !== 'READY' || !row.export_manifest_path) {
        skipped.push({
          attemptId: row.attempt_id,
          reason: `export artifacts are ${row.export_artifact_status.toLowerCase()}`,
        });
        return;
      }

      try {
        const manifest = (await downloadAttemptJson(
          containerClient,
          row.export_manifest_path,
        )) as ExportArtifactManifest;

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
