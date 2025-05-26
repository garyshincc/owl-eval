-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "prolificStudyId" TEXT,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comparison" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "modelA" TEXT NOT NULL,
    "modelB" TEXT NOT NULL,
    "videoAPath" TEXT NOT NULL,
    "videoBPath" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "prolificId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "completionCode" TEXT,
    "assignedComparisons" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "comparisonId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "chosenModel" TEXT NOT NULL,
    "dimensionScores" JSONB NOT NULL,
    "completionTimeSeconds" DOUBLE PRECISION,
    "clientMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_slug_key" ON "Experiment"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_prolificStudyId_key" ON "Experiment"("prolificStudyId");

-- CreateIndex
CREATE INDEX "Experiment_slug_idx" ON "Experiment"("slug");

-- CreateIndex
CREATE INDEX "Comparison_experimentId_idx" ON "Comparison"("experimentId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_prolificId_key" ON "Participant"("prolificId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_sessionId_key" ON "Participant"("sessionId");

-- CreateIndex
CREATE INDEX "Participant_prolificId_idx" ON "Participant"("prolificId");

-- CreateIndex
CREATE INDEX "Participant_experimentId_idx" ON "Participant"("experimentId");

-- CreateIndex
CREATE INDEX "Evaluation_comparisonId_idx" ON "Evaluation"("comparisonId");

-- CreateIndex
CREATE INDEX "Evaluation_participantId_idx" ON "Evaluation"("participantId");

-- CreateIndex
CREATE INDEX "Evaluation_experimentId_idx" ON "Evaluation"("experimentId");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_comparisonId_participantId_key" ON "Evaluation"("comparisonId", "participantId");

-- AddForeignKey
ALTER TABLE "Comparison" ADD CONSTRAINT "Comparison_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "Comparison"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
