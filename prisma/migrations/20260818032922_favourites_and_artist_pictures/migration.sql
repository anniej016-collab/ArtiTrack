-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "imageUrlByHand" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Release" ADD COLUMN     "favourite" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "favourite" BOOLEAN NOT NULL DEFAULT false;

-- Artists whose picture cannot have come from a service already have one that
-- was typed in, so mark them before the first check can overwrite anything.
-- A service-added artist got theirs from the service, which is exactly the case
-- refreshing is for.
UPDATE "Artist"
SET "imageUrlByHand" = true
WHERE "imageUrl" IS NOT NULL AND "source" IN ('manual', 'import');
