-- CreateEnum
CREATE TYPE "TestMode" AS ENUM ('TOBII', 'WEBCAM');

-- CreateEnum
CREATE TYPE "AttemptTaskType" AS ENUM ('FULL_BATTERY', 'PARAGRAPH', 'SYLLABLES', 'PSEUDO_WORDS', 'MEANINGFUL_TEXT');

-- CreateEnum
CREATE TYPE "AttemptOutcome" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CalibrationMode" AS ENUM ('GRID', 'STAR', 'STICKMAN');

-- CreateTable
CREATE TABLE "TestAttempt" (
    "attemptId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "testType" "TestMode" NOT NULL,
    "taskType" "AttemptTaskType" NOT NULL,
    "outcome" "AttemptOutcome" NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "calibrationMode" "CalibrationMode" NOT NULL,
    "age" INTEGER NOT NULL,
    "label" TEXT,
    "rawDataConsented" BOOLEAN NOT NULL DEFAULT false,
    "rawBlobUrl" TEXT,
    "derivedBlobUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestAttempt_pkey" PRIMARY KEY ("attemptId")
);

-- CreateIndex
CREATE INDEX "TestAttempt_userId_createdAt_idx" ON "TestAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TestAttempt_testType_createdAt_idx" ON "TestAttempt"("testType", "createdAt");

-- CreateIndex
CREATE INDEX "TestAttempt_taskType_createdAt_idx" ON "TestAttempt"("taskType", "createdAt");

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
