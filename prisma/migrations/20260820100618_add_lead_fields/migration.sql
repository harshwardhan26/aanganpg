-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "followupDate" TIMESTAMP(3),
ADD COLUMN     "lastMessageAt" TIMESTAMP(3),
ADD COLUMN     "rawMessage" TEXT,
ADD COLUMN     "stage" TEXT NOT NULL DEFAULT 'NEW';

-- CreateIndex
CREATE INDEX "Lead_propertyId_createdAt_idx" ON "Lead"("propertyId", "createdAt");
