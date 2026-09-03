-- Aangan Mess operational suite. All changes are additive so the release can
-- be rolled back at the application layer without destroying existing data.

-- CreateEnum
CREATE TYPE "MessPlan" AS ENUM ('TRIAL', 'STARTER', 'GROWTH');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED');
CREATE TYPE "FeeEntryKind" AS ENUM ('PAYMENT', 'REFUND', 'DISCOUNT', 'EXTRA_CHARGE', 'CREDIT');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK', 'OTHER');
CREATE TYPE "ReminderChannel" AS ENUM ('SMS', 'WHATSAPP');
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE "NoticeAudience" AS ENUM ('ALL', 'STUDENTS', 'STAFF');
CREATE TYPE "FeedbackCategory" AS ENUM ('FOOD', 'CLEANLINESS', 'SERVICE', 'BILLING', 'OTHER');
CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'RESOLVED');

-- AlterTable
ALTER TABLE "Mess"
  ADD COLUMN "address" TEXT,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "setupCompletedAt" TIMESTAMP(3),
  ADD COLUMN "scanKeyVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "skipCutoffMinutes" INTEGER NOT NULL DEFAULT 1200,
  ADD COLUMN "receiptCounter" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "subscriptionPlan" "MessPlan" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN "trialEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PaymentEntry" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "messId" TEXT NOT NULL,
  "kind" "FeeEntryKind" NOT NULL,
  "amount" INTEGER NOT NULL,
  "method" "PaymentMethod",
  "externalReference" TEXT,
  "activeReference" TEXT,
  "receiptNumber" TEXT,
  "note" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  "reversedAt" TIMESTAMP(3),
  "reversedById" TEXT,
  "reversalReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityEvent" (
  "id" TEXT NOT NULL,
  "messId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "kind" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "summary" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReminderDelivery" (
  "id" TEXT NOT NULL,
  "messId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "channel" "ReminderChannel" NOT NULL,
  "target" TEXT NOT NULL,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "providerRef" TEXT,
  "error" TEXT,
  "automated" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReminderDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MealSkip" (
  "id" TEXT NOT NULL,
  "messId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "day" DATE NOT NULL,
  "meal" "Meal" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MealSkip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenLog" (
  "id" TEXT NOT NULL,
  "messId" TEXT NOT NULL,
  "day" DATE NOT NULL,
  "meal" "Meal" NOT NULL,
  "preparedCount" INTEGER NOT NULL,
  "leftoverCount" INTEGER NOT NULL,
  "note" TEXT,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KitchenLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notice" (
  "id" TEXT NOT NULL,
  "messId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "audience" "NoticeAudience" NOT NULL DEFAULT 'ALL',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessInvite" (
  "id" TEXT NOT NULL,
  "messId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "MessRole" NOT NULL DEFAULT 'STAFF',
  "token" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessFeedback" (
  "id" TEXT NOT NULL,
  "messId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "category" "FeedbackCategory" NOT NULL,
  "rating" INTEGER,
  "message" TEXT NOT NULL,
  "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
  "ownerResponse" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessFeedback_pkey" PRIMARY KEY ("id")
);

-- Preserve the meaning of existing paid rows by backfilling one immutable
-- system entry for each. Future payments are recorded by the application.
INSERT INTO "PaymentEntry" (
  "id", "paymentId", "messId", "kind", "amount", "method",
  "receiptNumber", "occurredAt", "createdById", "createdAt"
)
SELECT
  'legacy-' || p."id", p."id", s."messId", 'PAYMENT', COALESCE(p."amount", 0),
  'OTHER', 'LEGACY-' || p."id", p."paidAt", 'system', p."paidAt"
FROM "Payment" p
JOIN "Student" s ON s."id" = p."studentId"
WHERE p."paidAt" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEntry_messId_receiptNumber_key" ON "PaymentEntry"("messId", "receiptNumber");
-- Uniqueness on the live reference, not the recorded one: a reversed entry
-- keeps `externalReference` for the audit trail but releases `activeReference`,
-- so a UPI reference booked against the wrong student can be booked again.
CREATE UNIQUE INDEX "PaymentEntry_messId_activeReference_key" ON "PaymentEntry"("messId", "activeReference");
CREATE INDEX "PaymentEntry_paymentId_occurredAt_idx" ON "PaymentEntry"("paymentId", "occurredAt");
CREATE INDEX "PaymentEntry_messId_occurredAt_idx" ON "PaymentEntry"("messId", "occurredAt");
CREATE INDEX "ActivityEvent_messId_createdAt_idx" ON "ActivityEvent"("messId", "createdAt");
CREATE INDEX "ReminderDelivery_messId_createdAt_idx" ON "ReminderDelivery"("messId", "createdAt");
CREATE INDEX "ReminderDelivery_paymentId_createdAt_idx" ON "ReminderDelivery"("paymentId", "createdAt");
CREATE UNIQUE INDEX "MealSkip_studentId_day_meal_key" ON "MealSkip"("studentId", "day", "meal");
CREATE INDEX "MealSkip_messId_day_meal_idx" ON "MealSkip"("messId", "day", "meal");
CREATE UNIQUE INDEX "KitchenLog_messId_day_meal_key" ON "KitchenLog"("messId", "day", "meal");
CREATE INDEX "KitchenLog_messId_day_idx" ON "KitchenLog"("messId", "day");
CREATE INDEX "Notice_messId_startsAt_idx" ON "Notice"("messId", "startsAt");
CREATE INDEX "Notice_messId_expiresAt_idx" ON "Notice"("messId", "expiresAt");
CREATE UNIQUE INDEX "MessInvite_token_key" ON "MessInvite"("token");
CREATE UNIQUE INDEX "MessInvite_messId_email_key" ON "MessInvite"("messId", "email");
CREATE INDEX "MessInvite_email_acceptedAt_idx" ON "MessInvite"("email", "acceptedAt");
CREATE INDEX "MessFeedback_messId_status_createdAt_idx" ON "MessFeedback"("messId", "status", "createdAt");
CREATE INDEX "MessFeedback_studentId_createdAt_idx" ON "MessFeedback"("studentId", "createdAt");

-- AddForeignKey
ALTER TABLE "PaymentEntry" ADD CONSTRAINT "PaymentEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentEntry" ADD CONSTRAINT "PaymentEntry_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderDelivery" ADD CONSTRAINT "ReminderDelivery_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderDelivery" ADD CONSTRAINT "ReminderDelivery_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealSkip" ADD CONSTRAINT "MealSkip_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealSkip" ADD CONSTRAINT "MealSkip_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenLog" ADD CONSTRAINT "KitchenLog_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessInvite" ADD CONSTRAINT "MessInvite_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessFeedback" ADD CONSTRAINT "MessFeedback_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessFeedback" ADD CONSTRAINT "MessFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
