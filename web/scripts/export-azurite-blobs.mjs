#!/usr/bin/env node

import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pipeline } from 'node:stream/promises';

import { BlobServiceClient } from '@azure/storage-blob';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DEFAULT_CONNECTION_STRING =
  process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING?.trim() || 'UseDevelopmentStorage=true';
const DEFAULT_CONTAINER = process.env.AZURE_BLOB_STORAGE_CONTAINER?.trim() || 'test-attempts';
const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'tmp', 'azurite-test-attempts');

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const connectionString = options.connectionString || DEFAULT_CONNECTION_STRING;
const containerName = options.container || DEFAULT_CONTAINER;
const outputDirectory = path.resolve(process.cwd(), options.output || DEFAULT_OUTPUT);

await fs.mkdir(outputDirectory, { recursive: true });

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

if (!(await containerClient.exists())) {
  throw new Error(
    `Container "${containerName}" does not exist. Run a persisted test first so Azurite creates it.`,
  );
}

let downloaded = 0;

for await (const blob of containerClient.listBlobsFlat()) {
  const blobPath = toSafeBlobPath(blob.name);
  const destination = path.join(outputDirectory, blobPath);
  await fs.mkdir(path.dirname(destination), { recursive: true });

  const response = await containerClient.getBlobClient(blob.name).download();
  if (!response.readableStreamBody) {
    throw new Error(`Blob "${blob.name}" returned no readable stream.`);
  }

  await pipeline(response.readableStreamBody, createWriteStream(destination));

  downloaded += 1;
  console.log(`Downloaded ${blob.name} -> ${path.relative(process.cwd(), destination)}`);
}

if (downloaded === 0) {
  console.log(`No blobs found in container "${containerName}".`);
} else {
  console.log(
    `Exported ${downloaded} blob(s) from "${containerName}" to ${path.relative(process.cwd(), outputDirectory)}`,
  );
}

function parseArgs(args) {
  const options = {
    connectionString: '',
    container: '',
    output: '',
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--connection-string') {
      options.connectionString = args[index + 1] || '';
      index += 1;
      continue;
    }

    if (arg === '--container') {
      options.container = args[index + 1] || '';
      index += 1;
      continue;
    }

    if (arg === '--output') {
      options.output = args[index + 1] || '';
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Export Lexora test blobs from Azurite into a normal local folder.

Usage:
  npm run blobs:export -- --output ./tmp/azurite-test-attempts

Optional flags:
  --container <name>            Override the blob container name
  --connection-string <value>   Override the storage connection string
  --output <path>               Destination folder for downloaded blobs
  --help                        Show this help
`);
}

function toSafeBlobPath(blobName) {
  const normalized = blobName.replace(/\\/g, '/').replace(/^\/+/, '');
  const segments = normalized
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    throw new Error(`Blob name "${blobName}" cannot be mapped to a local path.`);
  }

  return path.join(...segments);
}
