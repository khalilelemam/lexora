import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type { AttemptFilters } from '@/features/attempts/types';
import { buildWhereSql } from '@/features/attempts/server/shared-sql';

import type { ExportAttemptRow } from './export-types';

const BATCH_SIZE = 100;
const MAX_EXPORT_ROWS = 10_000;

/**
 * Yields batches of matching admin attempts, streaming through the full
 * result set without loading everything into memory at once.
 *
 * Uses keyset (cursor) pagination on (created_at DESC, attempt_id DESC)
 * to avoid OFFSET performance degradation on large tables.
 */
export async function* streamExportAttempts(
  filters: AttemptFilters,
): AsyncGenerator<ExportAttemptRow[]> {
  // Strip any client cursor — we paginate internally.
  const baseFilters: AttemptFilters = { ...filters, cursor: undefined, limit: undefined };
  let lastCreatedAt: Date | null = null;
  let lastAttemptId: string | null = null;
  let totalYielded = 0;

  while (totalYielded < MAX_EXPORT_ROWS) {
    const remaining = MAX_EXPORT_ROWS - totalYielded;
    const batchLimit = Math.min(BATCH_SIZE, remaining);

    const cursorCondition: Prisma.Sql =
      lastCreatedAt && lastAttemptId
        ? Prisma.sql`AND (a.created_at, a.attempt_id) < (${lastCreatedAt}, CAST(${lastAttemptId} AS uuid))`
        : Prisma.empty;

    const whereSql = buildWhereSql({
      filters: baseFilters,
      includeDeleted: true,
    });

    const rows: ExportAttemptRow[] = await prisma.$queryRaw<ExportAttemptRow[]>(Prisma.sql`
      SELECT
        a.attempt_id,
        a.test_type,
        a.outcome,
        a.model_version,
        a.calibration_mode,
        a.age,
        a.label,
        a.raw_data_consented,
        a.raw_blob_url,
        a.derived_blob_url,
        a.export_artifact_status,
        a.export_manifest_path,
        a.created_at,
        a.deleted_at,
        u.id   AS user_id,
        u.name AS user_name,
        u.email AS user_email
      FROM test_attempts a
      INNER JOIN users u ON u.id = a.user_id
      ${whereSql}
      ${cursorCondition}
      ORDER BY a.created_at DESC, a.attempt_id DESC
      LIMIT ${batchLimit}
    `);

    if (rows.length === 0) {
      break;
    }

    yield rows;
    totalYielded += rows.length;

    const lastRow: ExportAttemptRow = rows[rows.length - 1];
    lastCreatedAt = new Date(lastRow.created_at);
    lastAttemptId = lastRow.attempt_id;

    // If we got fewer rows than requested, there are no more.
    if (rows.length < batchLimit) {
      break;
    }
  }
}
