-- Separate where an artist came from and where their new releases are fetched.
--
-- These were one field, so an artist imported from a file could never also be
-- checked for new releases: pointing them at Deezer would have meant adding a
-- second artist with the same name. Origin stays in source/externalId; syncing
-- reads syncSource/syncExternalId, which an imported artist can be given later.
ALTER TABLE "Artist" ADD COLUMN "syncSource" TEXT;
ALTER TABLE "Artist" ADD COLUMN "syncExternalId" TEXT;
ALTER TABLE "Artist" ADD COLUMN "discographyUrl" TEXT;

-- Artists already added from a service keep syncing exactly as before.
UPDATE "Artist"
SET "syncSource" = "source", "syncExternalId" = "externalId"
WHERE "source" IN ('deezer', 'musicbrainz')
  AND "externalId" IS NOT NULL;

-- A release can now be known to both a file and a service at once, so the two
-- ids are held apart rather than fighting over one column.
ALTER TABLE "Release" ADD COLUMN "importKey" TEXT;

UPDATE "Release" AS r
SET "importKey" = r."externalId", "externalId" = NULL
FROM "Artist" AS a
WHERE a."id" = r."artistId"
  AND a."source" = 'import'
  AND r."externalId" IS NOT NULL;

CREATE UNIQUE INDEX "Release_artistId_importKey_key" ON "Release"("artistId", "importKey");
