/*
  Warnings:

  - You are about to drop the column `assignedComparisons` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `assignedVideoTasks` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the `Comparison` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Evaluation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SingleVideoEvaluation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VideoTask` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Comparison" DROP CONSTRAINT "Comparison_experimentId_fkey";

-- DropForeignKey
ALTER TABLE "Evaluation" DROP CONSTRAINT "Evaluation_comparisonId_fkey";

-- DropForeignKey
ALTER TABLE "Evaluation" DROP CONSTRAINT "Evaluation_experimentId_fkey";

-- DropForeignKey
ALTER TABLE "Evaluation" DROP CONSTRAINT "Evaluation_participantId_fkey";

-- DropForeignKey
ALTER TABLE "SingleVideoEvaluation" DROP CONSTRAINT "SingleVideoEvaluation_experimentId_fkey";

-- DropForeignKey
ALTER TABLE "SingleVideoEvaluation" DROP CONSTRAINT "SingleVideoEvaluation_participantId_fkey";

-- DropForeignKey
ALTER TABLE "SingleVideoEvaluation" DROP CONSTRAINT "SingleVideoEvaluation_videoTaskId_fkey";

-- DropForeignKey
ALTER TABLE "VideoTask" DROP CONSTRAINT "VideoTask_experimentId_fkey";

-- DropForeignKey
ALTER TABLE "VideoTask" DROP CONSTRAINT "VideoTask_videoId_fkey";

-- AlterTable
ALTER TABLE "Participant" DROP COLUMN "assignedComparisons",
DROP COLUMN "assignedVideoTasks",
ADD COLUMN     "assignedSingleVideoEvaluationTasks" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "assignedTwoVideoComparisonTasks" JSONB NOT NULL DEFAULT '[]';

-- DropTable
DROP TABLE "Comparison";

-- DropTable
DROP TABLE "Evaluation";

-- DropTable
DROP TABLE "SingleVideoEvaluation";

-- DropTable
DROP TABLE "VideoTask";

-- CreateTable
CREATE TABLE "TwoVideoComparisonTask" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "modelA" TEXT NOT NULL,
    "modelB" TEXT NOT NULL,
    "videoAPath" TEXT NOT NULL,
    "videoBPath" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoVideoComparisonTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoVideoComparisonSubmission" (
    "id" TEXT NOT NULL,
    "twoVideoComparisonTaskId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "chosenModel" TEXT,
    "dimensionScores" JSONB NOT NULL,
    "completionTimeSeconds" DOUBLE PRECISION,
    "clientMetadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "lastSavedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoVideoComparisonSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SingleVideoEvaluationTask" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "videoPath" TEXT NOT NULL,
    "videoId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SingleVideoEvaluationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SingleVideoEvaluationSubmission" (
    "id" TEXT NOT NULL,
    "singleVideoEvaluationTaskId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "dimensionScores" JSONB NOT NULL,
    "completionTimeSeconds" DOUBLE PRECISION,
    "clientMetadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "lastSavedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SingleVideoEvaluationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TwoVideoComparisonTask_experimentId_idx" ON "TwoVideoComparisonTask"("experimentId");

-- CreateIndex
CREATE INDEX "TwoVideoComparisonSubmission_twoVideoComparisonTaskId_idx" ON "TwoVideoComparisonSubmission"("twoVideoComparisonTaskId");

-- CreateIndex
CREATE INDEX "TwoVideoComparisonSubmission_participantId_idx" ON "TwoVideoComparisonSubmission"("participantId");

-- CreateIndex
CREATE INDEX "TwoVideoComparisonSubmission_experimentId_idx" ON "TwoVideoComparisonSubmission"("experimentId");

-- CreateIndex
CREATE INDEX "TwoVideoComparisonSubmission_status_idx" ON "TwoVideoComparisonSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TwoVideoComparisonSubmission_twoVideoComparisonTaskId_parti_key" ON "TwoVideoComparisonSubmission"("twoVideoComparisonTaskId", "participantId");

-- CreateIndex
CREATE INDEX "SingleVideoEvaluationTask_experimentId_idx" ON "SingleVideoEvaluationTask"("experimentId");

-- CreateIndex
CREATE INDEX "SingleVideoEvaluationTask_scenarioId_idx" ON "SingleVideoEvaluationTask"("scenarioId");

-- CreateIndex
CREATE INDEX "SingleVideoEvaluationSubmission_singleVideoEvaluationTaskId_idx" ON "SingleVideoEvaluationSubmission"("singleVideoEvaluationTaskId");

-- CreateIndex
CREATE INDEX "SingleVideoEvaluationSubmission_participantId_idx" ON "SingleVideoEvaluationSubmission"("participantId");

-- CreateIndex
CREATE INDEX "SingleVideoEvaluationSubmission_experimentId_idx" ON "SingleVideoEvaluationSubmission"("experimentId");

-- CreateIndex
CREATE INDEX "SingleVideoEvaluationSubmission_status_idx" ON "SingleVideoEvaluationSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SingleVideoEvaluationSubmission_singleVideoEvaluationTaskId_key" ON "SingleVideoEvaluationSubmission"("singleVideoEvaluationTaskId", "participantId");

-- AddForeignKey
ALTER TABLE "TwoVideoComparisonTask" ADD CONSTRAINT "TwoVideoComparisonTask_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoVideoComparisonSubmission" ADD CONSTRAINT "TwoVideoComparisonSubmission_twoVideoComparisonTaskId_fkey" FOREIGN KEY ("twoVideoComparisonTaskId") REFERENCES "TwoVideoComparisonTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoVideoComparisonSubmission" ADD CONSTRAINT "TwoVideoComparisonSubmission_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoVideoComparisonSubmission" ADD CONSTRAINT "TwoVideoComparisonSubmission_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleVideoEvaluationTask" ADD CONSTRAINT "SingleVideoEvaluationTask_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleVideoEvaluationTask" ADD CONSTRAINT "SingleVideoEvaluationTask_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleVideoEvaluationSubmission" ADD CONSTRAINT "SingleVideoEvaluationSubmission_singleVideoEvaluationTaskI_fkey" FOREIGN KEY ("singleVideoEvaluationTaskId") REFERENCES "SingleVideoEvaluationTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleVideoEvaluationSubmission" ADD CONSTRAINT "SingleVideoEvaluationSubmission_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleVideoEvaluationSubmission" ADD CONSTRAINT "SingleVideoEvaluationSubmission_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
