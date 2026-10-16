import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS "waitlist_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "child_age" INTEGER,
    "user_role" TEXT NOT NULL DEFAULT 'parent',
    "notes" TEXT,
    "consent_research" BOOLEAN NOT NULL DEFAULT 1,
    "has_completed_test" BOOLEAN NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_entries_email_key" ON "waitlist_entries"("email");

CREATE TABLE IF NOT EXISTS "test_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "waitlist_entry_id" TEXT,
    "test_type" TEXT NOT NULL DEFAULT 'WEBCAM',
    "participant_age" INTEGER NOT NULL DEFAULT 8,
    "label" TEXT DEFAULT 'Research Participant',
    "reading_language" TEXT NOT NULL DEFAULT 'ar',
    "calibration_mode" TEXT NOT NULL DEFAULT 'GRID',
    "calibration_quality" TEXT NOT NULL DEFAULT 'good',
    "average_error" REAL,
    "json_file_path" TEXT,
    "total_gaze_points" INTEGER NOT NULL DEFAULT 0,
    "syllables_point_count" INTEGER NOT NULL DEFAULT 0,
    "pseudo_words_point_count" INTEGER NOT NULL DEFAULT 0,
    "meaningful_text_point_count" INTEGER NOT NULL DEFAULT 0,
    "screen_resolution" TEXT,
    "user_agent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "test_attempts_waitlist_entry_id_fkey" FOREIGN KEY ("waitlist_entry_id") REFERENCES "waitlist_entries" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT 0,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "terms_accepted_at" DATETIME,
    "raw_data_consent" BOOLEAN NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expires_at" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_key" ON "sessions"("token");

CREATE TABLE IF NOT EXISTS "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" DATETIME,
    "refresh_token_expires_at" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "verifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

function getDatabaseConfig(): { url: string; filePath: string } {
  let url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.VERCEL) {
      url = 'file:/tmp/dev.db';
    } else {
      url = 'file:./dev.db';
    }
  }

  const rawPath = url.replace(/^file:/, '');
  const filePath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), rawPath);
  return { url, filePath };
}

function ensureTables(filePath: string) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const db = new Database(filePath);
    db.pragma('journal_mode = WAL');
    db.exec(SCHEMA_DDL);
    db.close();
  } catch (err) {
    console.warn('[Prisma SQLite Init Warning]: Could not auto-init tables:', err);
  }
}

function createPrismaClient(): PrismaClient {
  const { url, filePath } = getDatabaseConfig();
  ensureTables(filePath);
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
