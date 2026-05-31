-- AlterTable
ALTER TABLE "User" ADD COLUMN     "rawDataConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
