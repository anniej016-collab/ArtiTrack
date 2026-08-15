-- AlterTable
ALTER TABLE "Release" ADD COLUMN     "listened" BOOLEAN NOT NULL DEFAULT false;

-- Preserve what is already marked as listened.
UPDATE "Release" SET "listened" = true WHERE "listenedAt" IS NOT NULL;

-- Importing a back catalogue used to stamp listenedAt with the moment of import,
-- which reads as "you heard all of this today". Those rows are identifiable: the
-- import writes listenedAt and createdAt in the same statement, so they sit within
-- a moment of each other, and only provider-imported releases have an externalId.
-- Clear the date while keeping the listened flag. A date set by actually pressing
-- the button lands well after createdAt and is left alone.
UPDATE "Release"
SET "listenedAt" = NULL
WHERE "listenedAt" IS NOT NULL
  AND "externalId" IS NOT NULL
  AND "listenedAt" <= "createdAt" + INTERVAL '5 seconds';

-- DropIndex
DROP INDEX "Release_listenedAt_idx";

-- CreateIndex
CREATE INDEX "Release_listened_idx" ON "Release"("listened");
