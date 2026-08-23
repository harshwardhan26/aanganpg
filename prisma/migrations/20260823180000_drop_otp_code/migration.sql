-- Phone OTP sign-in was removed in favour of Google. Nothing reads this table,
-- and it held 0 rows when this migration was written.
-- DropTable
DROP TABLE "OtpCode";
