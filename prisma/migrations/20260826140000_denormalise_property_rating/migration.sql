-- The search page renders many cards at once and computed each card's rating by
-- pulling every review of every listing. These two columns replace that read;
-- `syncPropertyRating()` maintains them in the same transaction as every review
-- write, so they cannot drift from the reviews they summarise.
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "ratingAvg" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill from the reviews that already exist, so the columns are correct the
-- moment the new code reads them rather than only after the next review write.
UPDATE "Property" p
SET "ratingAvg"   = r.avg_rating,
    "ratingCount" = r.n
FROM (
  SELECT "propertyId", AVG(rating)::double precision AS avg_rating, COUNT(*)::int AS n
  FROM "Review"
  GROUP BY "propertyId"
) r
WHERE p.id = r."propertyId";
