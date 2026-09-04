-- The migration that was never written.
--
-- `Review` and `ReviewCode` reached production through `prisma db push`, so no
-- migration ever created them. Everything still worked, because production
-- already had the tables — but the history could not be replayed, and the next
-- migration along (`20260826140000_denormalise_property_rating`) reads `Review`
-- to backfill the rating columns. On any fresh database that backfill failed
-- with `relation "Review" does not exist`, which is why there has never been a
-- staging database, a CI database, or a way to bring up a new developer.
--
-- Dated before that backfill so a replay creates the tables first. Every
-- statement is idempotent, so on production this applies cleanly and changes
-- nothing: the tables, indexes and constraints are all already there.

CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "verifiedVia" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- Without `usedAt` and `usedByUserId`: `20260901120000_review_code_single_use`
-- adds those, and adding them here would leave that migration adding nothing on
-- a fresh database while it still had work to do on production.
CREATE TABLE IF NOT EXISTS "ReviewCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "ReviewCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Review_propertyId_userId_key" ON "Review"("propertyId", "userId");
CREATE INDEX IF NOT EXISTS "Review_propertyId_idx" ON "Review"("propertyId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReviewCode_code_key" ON "ReviewCode"("code");
CREATE INDEX IF NOT EXISTS "ReviewCode_propertyId_idx" ON "ReviewCode"("propertyId");

-- Postgres has no `ADD CONSTRAINT IF NOT EXISTS`, so each foreign key is added
-- only when it is absent. Re-running must not error on production.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Review_propertyId_fkey') THEN
    ALTER TABLE "Review" ADD CONSTRAINT "Review_propertyId_fkey"
      FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Review_userId_fkey') THEN
    ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReviewCode_propertyId_fkey') THEN
    ALTER TABLE "ReviewCode" ADD CONSTRAINT "ReviewCode_propertyId_fkey"
      FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
