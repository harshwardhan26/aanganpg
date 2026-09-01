-- A review code is spent when it is used.
--
-- Before this a code was a password with no expiry and no limit: one code per
-- listing, handed to a warden, good forever and good for everybody. A photo of
-- a notice board or one forwarded WhatsApp message turned it into an unlimited
-- supply of "verified" reviews for that hostel. The whole product rests on the
-- claim that a review came from somebody who lived there, so the code has to be
-- a ticket, not a password.
--
-- `usedAt` is the ticket being torn. `usedByUserId` is who tore it, kept so an
-- odd review can be traced back rather than only counted. Nullable, so every
-- code already issued stays valid for its first use and is spent after it.
ALTER TABLE "ReviewCode" ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3);
ALTER TABLE "ReviewCode" ADD COLUMN IF NOT EXISTS "usedByUserId" TEXT;

-- The admin panel looks up the current code for a listing, which now means the
-- unused one.
CREATE INDEX IF NOT EXISTS "ReviewCode_propertyId_usedAt_idx" ON "ReviewCode"("propertyId", "usedAt");
