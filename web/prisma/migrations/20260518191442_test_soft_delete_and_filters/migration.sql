-- DropIndex
DROP INDEX "test_attempts_test_type_created_at_idx";

-- DropIndex
DROP INDEX "test_attempts_user_id_created_at_idx";

-- AlterTable
ALTER TABLE "test_attempts" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ALTER COLUMN "label" SET NOT NULL,
ALTER COLUMN "derived_blob_url" SET NOT NULL;

-- CreateIndex
CREATE INDEX "test_attempts_user_id_deleted_at_created_at_idx" ON "test_attempts"("user_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "test_attempts_deleted_at_test_type_created_at_idx" ON "test_attempts"("deleted_at", "test_type", "created_at");
