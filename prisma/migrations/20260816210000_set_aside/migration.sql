-- A third state for a release: set aside.
--
-- Heard and unheard both say the wrong thing about a record you have decided
-- not to play. Unheard keeps it in the To listen queue indefinitely; heard is
-- a lie. Set aside takes it out of the queue while admitting you haven't heard
-- it, and can be undone at any time.
ALTER TABLE "Release" ADD COLUMN "setAside" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Release" ADD COLUMN "setAsideAt" TIMESTAMP(3);
CREATE INDEX "Release_setAside_idx" ON "Release"("setAside");
