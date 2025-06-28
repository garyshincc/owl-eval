-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "screeningAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "screeningCompletedAt" TIMESTAMP(3),
ADD COLUMN     "screeningData" JSONB,
ADD COLUMN     "screeningStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "screeningVersion" TEXT;
