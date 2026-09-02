-- CreateEnum
CREATE TYPE "Meal" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER');

-- AlterEnum
-- Scans are a third way a student gets marked present, alongside a staff tap and
-- (later) a face match.
ALTER TYPE "AttendanceMethod" ADD VALUE 'SCAN';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "email" TEXT,
                      ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
-- Existing rows predate meals entirely. They were staff taps at a mess that only
-- tracked one presence a day, and lunch is the meal that presence meant, so they
-- are filed there rather than deleted. The default is dropped immediately after
-- so that every new row must say which meal it is.
ALTER TABLE "Attendance" ADD COLUMN "meal" "Meal" NOT NULL DEFAULT 'LUNCH';
ALTER TABLE "Attendance" ALTER COLUMN "meal" DROP DEFAULT;

-- DropIndex
DROP INDEX "Attendance_studentId_day_key";

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_day_meal_key" ON "Attendance"("studentId", "day", "meal");

-- CreateIndex
CREATE UNIQUE INDEX "Student_messId_email_key" ON "Student"("messId", "email");
