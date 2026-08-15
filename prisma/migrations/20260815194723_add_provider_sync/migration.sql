-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "lastSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Release" ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Artist_source_externalId_key" ON "Artist"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Release_artistId_externalId_key" ON "Release"("artistId", "externalId");

