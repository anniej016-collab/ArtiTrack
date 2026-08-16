-- Let a release carry the kind it was told it is.
--
-- The four stored types can't express a soundtrack or a concert film, and the
-- category otherwise has to be guessed from the title — which reads a
-- soundtrack with an ordinary name as a compilation. An imported file states
-- these outright, so that statement is kept rather than thrown away and
-- re-guessed.
ALTER TABLE "Release" ADD COLUMN "category" TEXT;
