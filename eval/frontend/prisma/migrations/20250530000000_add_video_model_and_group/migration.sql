-- AlterTable
ALTER TABLE "Experiment" ADD COLUMN IF NOT EXISTS "group" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Video" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "duration" DOUBLE PRECISION,
    "metadata" JSONB,
    "tags" TEXT[],
    "groups" TEXT[],
    "modelName" TEXT,
    "scenarioId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Video_key_key" ON "Video"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Video_tags_idx" ON "Video"("tags");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Video_groups_idx" ON "Video"("groups");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Video_modelName_idx" ON "Video"("modelName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Video_scenarioId_idx" ON "Video"("scenarioId");