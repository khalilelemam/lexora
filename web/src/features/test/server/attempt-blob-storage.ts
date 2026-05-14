import 'server-only';

import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';

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
  const blobClient = containerClient.getBlockBlobClient(path);

  await blobClient.uploadData(body, {
    blobHTTPHeaders: {
      blobContentType: JSON_CONTENT_TYPE,
    },
  });

  return blobClient.url;
}
