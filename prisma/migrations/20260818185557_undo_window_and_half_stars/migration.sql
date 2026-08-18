-- AlterTable
ALTER TABLE "Release" ADD COLUMN     "unheardAt" TIMESTAMP(3);

-- Ratings become half-stars, stored doubled: what was 4 out of 5 is now 8 out
-- of 10 and still reads as four stars. Done here rather than left to the app so
-- there is never a moment where a 4 means either four stars or two.
UPDATE "Release" SET rating = rating * 2 WHERE rating IS NOT NULL;
