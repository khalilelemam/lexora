import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAttemptsUser } from '@/features/attempts/server/auth';
import { toAttemptsErrorResponse } from '@/features/attempts/server/http';
import { parseAttemptFilters } from '@/features/attempts/server/filters';
import { buildExportZipStream } from '@/features/attempts/server/export/export-zip-builder';
import type { ExportContentMode } from '@/features/attempts/server/export/export-types';

const VALID_CONTENT_MODES = new Set<ExportContentMode>(['raw', 'derived', 'both']);

/**
 * GET /api/admin/export
 *
 * Generates a ZIP archive of test attempt data based on the current
 * dashboard filters and content selection (raw, derived, or both).
 *
 * The response streams the ZIP directly — no temporary files are created.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminAttemptsUser();

    const searchParams = request.nextUrl.searchParams;
    const filters = parseAttemptFilters(searchParams);

    // Validate content mode.
    const include = (searchParams.get('include') ?? 'both') as ExportContentMode;
    if (!VALID_CONTENT_MODES.has(include)) {
      return NextResponse.json(
        { error: `Invalid content mode: ${include}. Use 'raw', 'derived', or 'both'.` },
        { status: 400 },
      );
    }

    const includeVisualsStr = searchParams.get('includeVisuals');
    const includeVisuals = includeVisualsStr !== 'false';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `lexora-export-${timestamp}.zip`;

    const zipStream = buildExportZipStream({ filters, include, includeVisuals });

    // Convert the Node.js PassThrough stream to a Web ReadableStream
    // for the Next.js Response API.
    const webStream = new ReadableStream({
      start(controller) {
        zipStream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        zipStream.on('end', () => {
          controller.close();
        });
        zipStream.on('error', (err) => {
          controller.error(err);
        });
      },
      cancel() {
        zipStream.destroy();
      },
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return toAttemptsErrorResponse(error);
  }
}
