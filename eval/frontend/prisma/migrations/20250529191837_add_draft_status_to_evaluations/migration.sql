/*
  Warnings:

  - Added the required column `lastSavedAt` to the `Evaluation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "lastSavedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ALTER COLUMN "chosenModel" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Evaluation_status_idx" ON "Evaluation"("status");
