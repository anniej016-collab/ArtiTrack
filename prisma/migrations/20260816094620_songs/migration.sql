-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "listened" BOOLEAN NOT NULL DEFAULT false,
    "listenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Track" ADD COLUMN "isrc" TEXT,
                    ADD COLUMN "songId" TEXT;

-- Fold existing tracks into songs, carrying their listening state across.
--
-- This uses a deliberately weaker rule than the application does: it lowercases
-- and strips punctuation but keeps qualifiers, so "Karma Police (Remastered)"
-- stays separate from "Karma Police" for now. Under-folding is the safe
-- direction — nothing can be wrongly marked heard — and the next tracklist sync
-- re-folds that artist properly using the real rule.
INSERT INTO "Song" ("id", "artistId", "key", "title", "listened", "listenedAt", "createdAt")
SELECT
    gen_random_uuid()::text,
    r."artistId",
    lower(btrim(regexp_replace(t."title", '[^a-zA-Z0-9]+', ' ', 'g'))),
    min(t."title"),
    bool_or(t."listened"),
    max(t."listenedAt"),
    CURRENT_TIMESTAMP
FROM "Track" t
JOIN "Release" r ON r."id" = t."releaseId"
GROUP BY r."artistId", lower(btrim(regexp_replace(t."title", '[^a-zA-Z0-9]+', ' ', 'g')));

UPDATE "Track" t
SET "songId" = s."id"
FROM "Release" r, "Song" s
WHERE r."id" = t."releaseId"
  AND s."artistId" = r."artistId"
  AND s."key" = lower(btrim(regexp_replace(t."title", '[^a-zA-Z0-9]+', ' ', 'g')));

-- DropIndex
DROP INDEX "Track_listened_idx";

-- AlterTable
ALTER TABLE "Track" DROP COLUMN "listened",
                    DROP COLUMN "listenedAt";

-- CreateIndex
CREATE INDEX "Song_artistId_idx" ON "Song"("artistId");
CREATE INDEX "Song_listened_idx" ON "Song"("listened");
CREATE UNIQUE INDEX "Song_artistId_key_key" ON "Song"("artistId", "key");
CREATE INDEX "Track_songId_idx" ON "Track"("songId");

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Song" ADD CONSTRAINT "Song_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
