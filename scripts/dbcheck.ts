/**
 * The checks that need a real database.
 *
 * `scripts/selfcheck.ts` is deliberately offline — every assertion in it runs on
 * a pure function, which is why CI can run it against a connection string that
 * points at nothing. That leaves the money code untested exactly where it is
 * hardest to reason about: the transaction boundaries, the unique indexes, and
 * the one statement that decides whether a parent is texted twice. None of that
 * is a pure function, and none of it can be proved by reading.
 *
 * So this file talks to Postgres. It creates one throwaway mess, asserts against
 * it, and deletes it — the cascade on `Mess` takes the students, payments and
 * entries with it, so nothing survives a run either way.
 *
 * It refuses to run against anything but a local database. Pointing this at
 * production would write real rows into a real ledger.
 */

import assert from "node:assert";
import prisma from "../src/lib/prisma";
import { feeBalance, receiptNumber } from "../src/lib/mess-finance";
import { MANUAL_REMINDER_COOLDOWN_HOURS } from "../src/lib/mess";

try { process.loadEnvFile(); } catch {}

/**
 * Local databases only.
 *
 * The whole file writes. A misread environment variable is the difference
 * between a test run and inventing payments in a live mess's books, so the
 * check is a hostname allowlist rather than a "looks like production" guess.
 */
function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Point it at a local database to run the database checks.");
  }
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("DATABASE_URL is not a URL this check can verify as local.");
  }
  const local = ["localhost", "127.0.0.1", "::1", "postgres", "db"];
  if (!local.includes(host)) {
    throw new Error(
      `Refusing to run database checks against "${host}". These checks write rows. ` +
        "Point DATABASE_URL at a local Postgres, or run them in CI.",
    );
  }
}

/** The month every check below files its payments under. */
const MONTH = new Date("2026-04-01T00:00:00.000Z");
const PRIOR_MONTH = new Date("2026-03-01T00:00:00.000Z");

async function main() {
  assertLocalDatabase();

  const mess = await prisma.mess.create({ data: { name: "Database check mess" } });

  try {
    const student = await prisma.student.create({
      data: { messId: mess.id, name: "Asha Patil", monthlyFee: 2000, parentPhone: "+919876543210" },
    });

    // --- Two partial payments settle one month, and each gets its own receipt.
    // The acceptance check the whole ledger exists for: an owner takes ₹500
    // today and ₹1,500 next week, and the month is then settled exactly once.
    {
      const payment = await prisma.payment.create({
        data: { studentId: student.id, month: MONTH, amount: 2000 },
      });

      const receipts: string[] = [];
      for (const amount of [500, 1500]) {
        const counter = await prisma.mess.update({
          where: { id: mess.id },
          data: { receiptCounter: { increment: 1 } },
          select: { receiptCounter: true },
        });
        const number = receiptNumber(counter.receiptCounter, MONTH);
        receipts.push(number);
        await prisma.paymentEntry.create({
          data: {
            paymentId: payment.id, messId: mess.id, kind: "PAYMENT", amount,
            method: "CASH", receiptNumber: number, createdById: "dbcheck",
          },
        });
      }

      const entries = await prisma.paymentEntry.findMany({
        where: { paymentId: payment.id },
        select: { kind: true, amount: true, reversedAt: true },
      });
      assert.equal(feeBalance(2000, entries), 0, "two partial payments must settle the month exactly");
      assert.equal(new Set(receipts).size, 2, "each payment must get its own receipt number");
    }

    // --- Reversing a payment restores the balance and keeps the original.
    // Financial records are corrected, never deleted: after the reversal the
    // row is still there, still readable, and no longer counted.
    {
      const payment = await prisma.payment.findFirstOrThrow({ where: { studentId: student.id, month: MONTH } });
      const wrong = await prisma.paymentEntry.findFirstOrThrow({
        where: { paymentId: payment.id, amount: 1500 },
      });

      await prisma.paymentEntry.update({
        where: { id: wrong.id },
        data: { reversedAt: new Date(), reversedById: "dbcheck", reversalReason: "recorded against the wrong student", activeReference: null },
      });

      const after = await prisma.paymentEntry.findMany({
        where: { paymentId: payment.id },
        select: { kind: true, amount: true, reversedAt: true },
      });
      assert.equal(feeBalance(2000, after), 1500, "reversing a payment must put the money back on the balance");
      assert.equal(after.length, 2, "the reversed entry must survive the reversal");
    }

    // --- A UPI reference is unique while it stands, and free once reversed.
    // The bug this replaced: a reference booked against the wrong student could
    // never be booked against the right one, for the life of the mess.
    {
      const payment = await prisma.payment.findFirstOrThrow({ where: { studentId: student.id, month: MONTH } });
      const reference = "UPI-DBCHECK-0001";

      const first = await prisma.paymentEntry.create({
        data: {
          paymentId: payment.id, messId: mess.id, kind: "PAYMENT", amount: 100,
          method: "UPI", externalReference: reference, activeReference: reference,
          receiptNumber: "AM-2026-900001", createdById: "dbcheck",
        },
      });

      await assert.rejects(
        prisma.paymentEntry.create({
          data: {
            paymentId: payment.id, messId: mess.id, kind: "PAYMENT", amount: 100,
            method: "UPI", externalReference: reference, activeReference: reference,
            receiptNumber: "AM-2026-900002", createdById: "dbcheck",
          },
        }),
        "the same UPI reference must not be recorded twice while the first still stands",
      );

      await prisma.paymentEntry.update({
        where: { id: first.id },
        data: { reversedAt: new Date(), reversedById: "dbcheck", reversalReason: "wrong student", activeReference: null },
      });

      const second = await prisma.paymentEntry.create({
        data: {
          paymentId: payment.id, messId: mess.id, kind: "PAYMENT", amount: 100,
          method: "UPI", externalReference: reference, activeReference: reference,
          receiptNumber: "AM-2026-900003", createdById: "dbcheck",
        },
      });
      assert.equal(second.activeReference, reference, "a reversed reference must be usable again");

      const original = await prisma.paymentEntry.findUniqueOrThrow({ where: { id: first.id } });
      assert.equal(original.externalReference, reference, "the reversed entry must keep what was typed, for the audit trail");
      assert.equal(original.activeReference, null, "the reversed entry must release the reference");
    }

    // --- A double-tapped reminder is sent once.
    // The claim is one statement precisely so that two of them racing cannot
    // both win. Firing them together is the only way to prove that.
    {
      const payment = await prisma.payment.findFirstOrThrow({ where: { studentId: student.id, month: MONTH } });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { remindersSent: 0, lastReminderAt: null },
      });

      const now = new Date();
      const cutoff = new Date(now.getTime() - MANUAL_REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000);
      const claim = () =>
        prisma.payment.updateMany({
          where: { id: payment.id, OR: [{ lastReminderAt: null }, { lastReminderAt: { lte: cutoff } }] },
          data: { remindersSent: { increment: 1 }, lastReminderAt: now },
        });

      const [a, b] = await Promise.all([claim(), claim()]);
      assert.equal(a.count + b.count, 1, "two reminder taps arriving together must claim the slot exactly once");

      const after = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      assert.equal(after.remindersSent, 1, "a double tap must count as one reminder, not two");

      // And the owner can send again once the cooldown has genuinely passed.
      await prisma.payment.update({
        where: { id: payment.id },
        data: { lastReminderAt: new Date(now.getTime() - (MANUAL_REMINDER_COOLDOWN_HOURS + 1) * 60 * 60 * 1000) },
      });
      const later = await claim();
      assert.equal(later.count, 1, "the owner must be able to send again after the cooldown");
    }

    // --- Changing a student's fee does not rewrite earlier months.
    // The charge is copied onto the Payment row when the month opens, so a fee
    // raised in April leaves March's books exactly as they were.
    {
      const march = await prisma.payment.create({
        data: { studentId: student.id, month: PRIOR_MONTH, amount: 2000 },
      });
      await prisma.student.update({ where: { id: student.id }, data: { monthlyFee: 2500 } });

      const unchanged = await prisma.payment.findUniqueOrThrow({ where: { id: march.id } });
      assert.equal(unchanged.amount, 2000, "raising the fee must not rewrite a month already billed");
    }

    // --- A student who has left still owes what they owed.
    // They stop appearing on today's roll, but the month they left owing must
    // still be reachable, or the debt quietly disappears.
    {
      await prisma.student.update({ where: { id: student.id }, data: { leftAt: new Date("2026-04-20T00:00:00.000Z") } });
      const owing = await prisma.payment.findMany({ where: { studentId: student.id } });
      assert(owing.length >= 2, "a student who leaves must keep the months they were billed for");
    }

    console.log("Database check passed");
  } finally {
    // The cascade takes the students, payments and entries with it.
    await prisma.mess.delete({ where: { id: mess.id } }).catch(() => {});
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
