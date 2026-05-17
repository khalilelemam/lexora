import { BlobServiceClient } from '@azure/storage-blob';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const STORAGE_CONNECTION_STRING = process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING;
const STORAGE_CONTAINER = process.env.AZURE_BLOB_STORAGE_CONTAINER ?? 'test-attempts';
const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL;

const CONTENT = {
  syllables:
    'ba  da  ka  ma  pa  ta\nfi  lo  re  su  we  zi\nbla  cra  dri  fro  glu  ple\nsna  spe  stra  tri  twi  whi',
  'pseudo-words':
    'bafmol  trinset  glopwed  furkane\nchasdim  pluvort  snelkab  winthoz\ndremfil  quabish  zontrel  krapfin',
  'meaningful-text':
    'The small brown dog ran quickly across the green field. It was chasing a bright red ball that bounced higher and higher. The children laughed and clapped as they watched the happy dog play in the warm afternoon sun.',
};

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required.');
}

if (!STORAGE_CONNECTION_STRING) {
  throw new Error('AZURE_BLOB_STORAGE_CONNECTION_STRING is required.');
}

const client = new Client({ connectionString: DATABASE_URL });
const container = BlobServiceClient.fromConnectionString(STORAGE_CONNECTION_STRING).getContainerClient(
  STORAGE_CONTAINER,
);

await client.connect();
await container.createIfNotExists();

try {
  const user = await resolveSeedUser();
  const attempts = [
    createAttempt(user.id, 'LOW', 'Demo Tobii - low risk', 0.18, 0.91, 34),
    createAttempt(user.id, 'MEDIUM', 'Demo Tobii - possible indicators', 0.56, 0.82, 42),
    createAttempt(user.id, 'HIGH', 'Demo Tobii - high risk', 0.84, 0.88, 52),
  ];

  for (const attempt of attempts) {
    await uploadDerivedArtifact(attempt);
    await upsertAttempt(attempt);
  }

  console.log(`Seeded ${attempts.length} Tobii attempts for ${user.email} (${user.id}).`);
} finally {
  await client.end();
}

async function resolveSeedUser() {
  if (SEED_USER_EMAIL) {
    const existing = await findUserByEmail(SEED_USER_EMAIL);
    if (existing) return existing;
  }

  const existing = await client.query(
    `SELECT id, email FROM users ORDER BY role = 'ADMIN' DESC, created_at ASC LIMIT 1`,
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const id = 'demo-tobii-user';
  const email = SEED_USER_EMAIL ?? 'demo.tobii@lexora.local';

  await client.query(
    `
      INSERT INTO users (id, email, email_verified, role, created_at, updated_at, raw_data_consent)
      VALUES ($1, $2, true, 'ADMIN', now(), now(), true)
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now()
    `,
    [id, email],
  );

  return { id, email };
}

async function findUserByEmail(email) {
  const result = await client.query(`SELECT id, email FROM users WHERE email = $1 LIMIT 1`, [email]);
  return result.rows[0] ?? null;
}

function createAttempt(userId, outcome, label, probability, confidence, fixationCount) {
  const attemptId = randomUUID();
  const features = createFeatures(fixationCount);

  return {
    attemptId,
    userId,
    outcome,
    label,
    probability,
    confidence,
    features,
    artifact: {
      mlResponse: {
        dyslexiaProbability: probability,
        riskLevel: outcome.toLowerCase(),
        confidence,
        metadata: {
          sequencesAnalyzed: 3,
          totalFixations: features.length,
        },
        modelVersion: 'demo-tobii-v1',
        features: {
          syllables: features.slice(0, 8),
          pseudo: features.slice(8, 18),
          meaningful: features,
        },
      },
      contentSnapshot: {
        version: 1,
        primaryTask: 'meaningful-text',
        tasks: CONTENT,
      },
    },
  };
}

function createFeatures(count) {
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const isReturnSweep = col === 0 && index > 0;
    const isRegression = index % 11 === 0;

    return {
      timestamp: index * 220,
      durationMs: 140 + ((index * 37) % 180),
      fixationX: isReturnSweep ? 0.23 : 0.22 + col * 0.065 - (isRegression ? 0.045 : 0),
      fixationY: 0.18 + row * 0.105,
      saccadeAmplitude: 0.04 + ((index * 13) % 30) / 1000,
      saccadeVelocity: 1.2 + ((index * 7) % 16) / 10,
    };
  });
}

async function uploadDerivedArtifact(attempt) {
  const blob = container.getBlockBlobClient(`derived/${attempt.attemptId}.json`);
  const body = Buffer.from(JSON.stringify(attempt.artifact, null, 2), 'utf8');

  await blob.uploadData(body, {
    blobHTTPHeaders: {
      blobContentType: 'application/json; charset=utf-8',
    },
  });
}

async function upsertAttempt(attempt) {
  const derivedBlobUrl = container.getBlockBlobClient(`derived/${attempt.attemptId}.json`).url;

  await client.query(
    `
      INSERT INTO test_attempts (
        attempt_id,
        user_id,
        test_type,
        outcome,
        model_version,
        calibration_mode,
        age,
        label,
        raw_data_consented,
        derived_blob_url,
        created_at,
        updated_at
      )
      VALUES ($1, $2, 'TOBII', $3, 'demo-tobii-v1', 'GRID', 9, $4, false, $5, now(), now())
      ON CONFLICT (attempt_id) DO UPDATE SET
        outcome = EXCLUDED.outcome,
        label = EXCLUDED.label,
        derived_blob_url = EXCLUDED.derived_blob_url,
        updated_at = now()
    `,
    [attempt.attemptId, attempt.userId, attempt.outcome, attempt.label, derivedBlobUrl],
  );
}
