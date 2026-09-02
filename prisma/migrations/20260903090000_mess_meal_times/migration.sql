-- Serving hours, per mess.
--
-- Minutes past midnight IST, not clock strings: every use is a comparison
-- against "now", and a string would have to be parsed first.
--
-- The defaults are the hours the module shipped with, so every existing mess
-- keeps behaving exactly as it did until its owner changes them.
ALTER TABLE "Mess"
  ADD COLUMN "breakfastFrom" INTEGER NOT NULL DEFAULT 390,
  ADD COLUMN "breakfastTo"   INTEGER NOT NULL DEFAULT 660,
  ADD COLUMN "lunchFrom"     INTEGER NOT NULL DEFAULT 660,
  ADD COLUMN "lunchTo"       INTEGER NOT NULL DEFAULT 960,
  ADD COLUMN "dinnerFrom"    INTEGER NOT NULL DEFAULT 1080,
  ADD COLUMN "dinnerTo"      INTEGER NOT NULL DEFAULT 1410;
