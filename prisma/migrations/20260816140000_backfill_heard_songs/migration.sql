-- Bring songs already under a heard release into line with it.
--
-- "Heard the release" and "heard its songs" only started moving together when
-- the rule was added; everything imported before that has releases marked heard
-- sitting over songs marked unheard. Left alone, the only way to correct a
-- back catalogue is to un-tick and re-tick every record by hand.
--
-- No listenedAt is set, for the same reason an imported back catalogue carries
-- no date: the release may have been heard years ago, and today's date would be
-- a fabrication.
UPDATE "Song" AS s
SET "listened" = true
WHERE s."listened" = false
  AND EXISTS (
    SELECT 1
    FROM "Track" AS t
    JOIN "Release" AS r ON r."id" = t."releaseId"
    WHERE t."songId" = s."id"
      AND r."listened" = true
  );
