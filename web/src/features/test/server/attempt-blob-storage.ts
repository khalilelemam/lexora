import 'server-only';

import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';
import type { Readable } from 'node:stream';

const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

export function createAttemptBlobContainerClient(): ContainerClient {
  const connectionString = process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING?.trim();
  const containerName = process.env.AZURE_BLOB_STORAGE_CONTAINER?.trim();

  if (!connectionString) {
    throw new Error('AZURE_BLOB_STORAGE_CONNECTION_STRING is not set.');
  }

  if (!containerName) {
    throw new Error('AZURE_BLOB_STORAGE_CONTAINER is not set.');
  }

  return BlobServiceClient.fromConnectionString(connectionString).getContainerClient(containerName);
}

export async function ensureAttemptBlobContainer(containerClient: ContainerClient): Promise<void> {
  await containerClient.createIfNotExists();
}

export async function uploadAttemptJson(
  containerClient: ContainerClient,
  path: string,
  data: unknown,
): Promise<string> {
  const body = Buffer.from(JSON.stringify(data, null, 2), 'utf8');
  return uploadAttemptBuffer(containerClient, path, body, JSON_CONTENT_TYPE);
}

export async function uploadAttemptText(
  containerClient: ContainerClient,
  path: string,
  data: string,
  contentType: string,
): Promise<string> {
  return uploadAttemptBuffer(containerClient, path, Buffer.from(data, 'utf8'), contentType);
}

export async function uploadAttemptBuffer(
  containerClient: ContainerClient,
  path: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  const blobClient = containerClient.getBlockBlobClient(path);

  await blobClient.uploadData(data, {
    blobHTTPHeaders: {
      blobContentType: contentType,
    },
  });

  return blobClient.url;
}

export async function downloadAttemptJson(containerClient: ContainerClient, path: string) {
  const blobClient = containerClient.getBlockBlobClient(path);
  const buffer = await blobClient.downloadToBuffer();

  return JSON.parse(buffer.toString('utf8')) as unknown;
}

/**
 * Uploads a data-URL image (JPEG or PNG) to blob storage.
 *
 * Strips the `data:image/...;base64,` prefix, decodes to a Buffer,
 * and uploads with the appropriate content type.
 */
export async function uploadAttemptImage(
  containerClient: ContainerClient,
  path: string,
  dataUrl: string,
): Promise<string> {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URL for image upload');
  }

  const contentType = match[1];
  const body = Buffer.from(match[2], 'base64');
  const blobClient = containerClient.getBlockBlobClient(path);

  await blobClient.uploadData(body, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blobClient.url;
}

/**
 * Downloads a blob as a raw Buffer. Used for binary assets like screenshots.
 * Returns null if the blob does not exist.
 */
export async function downloadAttemptBuffer(
  containerClient: ContainerClient,
  path: string,
): Promise<Buffer | null> {
  const blobClient = containerClient.getBlockBlobClient(path);

  try {
    return await blobClient.downloadToBuffer();
  } catch (error: unknown) {
    // 404 — blob doesn't exist (e.g. older tests without screenshots)
    if (
      error instanceof Object &&
      'statusCode' in error &&
      (error as { statusCode: number }).statusCode === 404
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Opens a blob as a Node readable stream so large export artifacts can be
 * appended to ZIP downloads without materialising each file in memory.
 */
export async function downloadAttemptStream(
  containerClient: ContainerClient,
  path: string,
): Promise<Readable | null> {
  const blobClient = containerClient.getBlockBlobClient(path);

  try {
    const response = await blobClient.download();
    return (response.readableStreamBody as Readable | undefined) ?? null;
  } catch (error: unknown) {
    if (
      error instanceof Object &&
      'statusCode' in error &&
      (error as { statusCode: number }).statusCode === 404
    ) {
      return null;
    }
    throw error;
  }
}
