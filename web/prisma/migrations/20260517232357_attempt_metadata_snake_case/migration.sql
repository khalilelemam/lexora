-- Rename enum types to snake_case while preserving existing values.
ALTER TYPE "Role" RENAME TO "role";
ALTER TYPE "TestMode" RENAME TO "test_mode";
ALTER TYPE "AttemptOutcome" RENAME TO "attempt_outcome";
ALTER TYPE "CalibrationMode" RENAME TO "calibration_mode";

-- Rename tables to snake_case/plural names.
ALTER TABLE "User" RENAME TO "users";
ALTER TABLE "Session" RENAME TO "sessions";
ALTER TABLE "Account" RENAME TO "accounts";
ALTER TABLE "Verification" RENAME TO "verifications";
ALTER TABLE "TestAttempt" RENAME TO "test_attempts";

-- Rename User columns.
ALTER TABLE "users" RENAME COLUMN "emailVerified" TO "email_verified";
ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "users" RENAME COLUMN "termsAcceptedAt" TO "terms_accepted_at";
ALTER TABLE "users" RENAME COLUMN "rawDataConsent" TO "raw_data_consent";

-- Rename Session columns.
ALTER TABLE "sessions" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "sessions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "sessions" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "sessions" RENAME COLUMN "ipAddress" TO "ip_address";
ALTER TABLE "sessions" RENAME COLUMN "userAgent" TO "user_agent";
ALTER TABLE "sessions" RENAME COLUMN "userId" TO "user_id";

-- Rename Account columns.
ALTER TABLE "accounts" RENAME COLUMN "accountId" TO "account_id";
ALTER TABLE "accounts" RENAME COLUMN "providerId" TO "provider_id";
ALTER TABLE "accounts" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "accounts" RENAME COLUMN "accessToken" TO "access_token";
ALTER TABLE "accounts" RENAME COLUMN "refreshToken" TO "refresh_token";
ALTER TABLE "accounts" RENAME COLUMN "idToken" TO "id_token";
ALTER TABLE "accounts" RENAME COLUMN "accessTokenExpiresAt" TO "access_token_expires_at";
ALTER TABLE "accounts" RENAME COLUMN "refreshTokenExpiresAt" TO "refresh_token_expires_at";
ALTER TABLE "accounts" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "accounts" RENAME COLUMN "updatedAt" TO "updated_at";

-- Rename Verification columns.
ALTER TABLE "verifications" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "verifications" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "verifications" RENAME COLUMN "updatedAt" TO "updated_at";

-- Rename TestAttempt columns and remove task-level metadata from attempt rows.
DROP INDEX IF EXISTS "TestAttempt_taskType_createdAt_idx";
ALTER TABLE "test_attempts" RENAME COLUMN "attemptId" TO "attempt_id";
ALTER TABLE "test_attempts" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "test_attempts" RENAME COLUMN "testType" TO "test_type";
ALTER TABLE "test_attempts" RENAME COLUMN "modelVersion" TO "model_version";
ALTER TABLE "test_attempts" RENAME COLUMN "calibrationMode" TO "calibration_mode";
ALTER TABLE "test_attempts" RENAME COLUMN "rawDataConsented" TO "raw_data_consented";
ALTER TABLE "test_attempts" RENAME COLUMN "rawBlobUrl" TO "raw_blob_url";
ALTER TABLE "test_attempts" RENAME COLUMN "derivedBlobUrl" TO "derived_blob_url";
ALTER TABLE "test_attempts" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "test_attempts" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "test_attempts" DROP COLUMN IF EXISTS "taskType";
ALTER TABLE "test_attempts" DROP COLUMN IF EXISTS "readingContent";
DROP TYPE "AttemptTaskType";

-- Rename constraints and indexes for readability in Postgres.
ALTER TABLE "users" RENAME CONSTRAINT "User_pkey" TO "users_pkey";
ALTER INDEX "User_email_key" RENAME TO "users_email_key";

ALTER TABLE "sessions" RENAME CONSTRAINT "Session_pkey" TO "sessions_pkey";
ALTER TABLE "sessions" RENAME CONSTRAINT "Session_userId_fkey" TO "sessions_user_id_fkey";
ALTER INDEX "Session_token_key" RENAME TO "sessions_token_key";

ALTER TABLE "accounts" RENAME CONSTRAINT "Account_pkey" TO "accounts_pkey";
ALTER TABLE "accounts" RENAME CONSTRAINT "Account_userId_fkey" TO "accounts_user_id_fkey";

ALTER TABLE "verifications" RENAME CONSTRAINT "Verification_pkey" TO "verifications_pkey";

ALTER TABLE "test_attempts" RENAME CONSTRAINT "TestAttempt_pkey" TO "test_attempts_pkey";
ALTER TABLE "test_attempts" RENAME CONSTRAINT "TestAttempt_userId_fkey" TO "test_attempts_user_id_fkey";
ALTER INDEX "TestAttempt_userId_createdAt_idx" RENAME TO "test_attempts_user_id_created_at_idx";
ALTER INDEX "TestAttempt_testType_createdAt_idx" RENAME TO "test_attempts_test_type_created_at_idx";
