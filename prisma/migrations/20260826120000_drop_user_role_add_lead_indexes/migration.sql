-- `User.role` was a second source of truth for who is an admin. `ADMIN_EMAILS`
-- is now the only one, and `resolveRole()` recomputes from it on every request,
-- so nothing in the application reads this column any more. Dropping it stops a
-- future write from silently reviving it.
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";

-- The lead dashboard orders by recency and filters by stage.
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX IF NOT EXISTS "Lead_stage_idx" ON "Lead"("stage");
