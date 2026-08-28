-- What a room costs on top of the rent.
--
-- The rent is on the card; the light bill is the surprise. A family from a
-- village budgets to the rupee before the student leaves home, and "light bill
-- separate, roughly ₹250 each" is the sentence that decides the listing.
--
-- Free text rather than a boolean per charge: the real answers are messier than
-- a checkbox, and one nullable column beats four that all mean "sometimes".
-- Nullable, so every existing listing reads as "ask the owner" until visited.
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "costNote" TEXT;
