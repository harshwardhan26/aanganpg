-- Owner leads.
--
-- A hostel owner being pitched runs the same pipeline as a student enquiring —
-- found them, spoke, met, yes, no — so they are Leads with a `kind`, not a
-- second table with a second copy of the follow-up logic.
--
-- The default is 'student' so every existing row keeps its current meaning:
-- every Lead written before this migration came from `recordEnquiry`.
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'student';

-- Free text, not a relation to Property: the hostel has not been listed yet.
-- That is precisely what the call is for.
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "hostelName" TEXT;

-- Every inbox query is scoped to one kind before it orders or filters.
CREATE INDEX IF NOT EXISTS "Lead_kind_createdAt_idx" ON "Lead"("kind", "createdAt");
CREATE INDEX IF NOT EXISTS "Lead_kind_followupDate_idx" ON "Lead"("kind", "followupDate");
