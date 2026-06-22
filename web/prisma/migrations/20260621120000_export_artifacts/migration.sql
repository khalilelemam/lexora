-- CreateEnum
CREATE TYPE "export_artifact_status" AS ENUM ('PENDING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "test_attempts"
ADD COLUMN "export_artifact_status" "export_artifact_status" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "export_manifest_path" TEXT,
ADD COLUMN "export_artifact_error" TEXT,
ADD COLUMN "export_artifact_ready_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "test_attempts_export_artifact_status_created_at_idx" ON "test_attempts"("export_artifact_status", "created_at");
