-- AlterTable
ALTER TABLE "Release" ADD COLUMN     "tracksSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "duration" INTEGER,
    "externalId" TEXT,
    "listened" BOOLEAN NOT NULL DEFAULT false,
    "listenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Track_releaseId_idx" ON "Track"("releaseId");

-- CreateIndex
CREATE INDEX "Track_listened_idx" ON "Track"("listened");

-- CreateIndex
CREATE UNIQUE INDEX "Track_releaseId_externalId_key" ON "Track"("releaseId", "externalId");

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

