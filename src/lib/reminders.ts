/**
 * The overdue-fee run.
 *
 * Kept out of the route handler so it can be called from a script or a test
 * with a fixed `now`, and so the route is nothing but authentication.
 *
 * Idempotent by construction: a `Payment` row records what was sent and when,
 * and `shouldRemind` refuses a second message inside the gap. Running the job
 * twice in one day therefore texts nobody twice — which matters, because a cron
 * that retries on failure is a cron that will do exactly that.
 */

import prisma from "./prisma";
import {
  attendanceDay,
  startOfIstMonth,
  dueDate,
  monthLabel,
  owesForMonth,
  shouldRemind,
  onRollDuringWhere,
} from "./mess";
import { overdueMessage, sendSms } from "./sms";

export type ReminderRun = {
  checked: number;
  due: number;
  sent: number;
  skipped: number;
  dryRun: boolean;
};

export async function runFeeReminders(now: Date): Promise<ReminderRun> {
  const today = attendanceDay(now);
  const month = startOfIstMonth(now);
  const label = monthLabel(month);

  const messes = await prisma.mess.findMany({
    select: {
      id: true,
      name: true,
      dueDay: true,
      // Anyone on the roll during this month, not only those still on it: a
      // student who leaves owing September must still be chased for September.
      // `owesForMonth` is what decides whether they actually owe it.
      students: {
        where: onRollDuringWhere(month),
        select: {
          id: true,
          name: true,
          parentPhone: true,
          monthlyFee: true,
          joinedAt: true,
          leftAt: true,
          payments: { where: { month }, select: { paidAt: true, remindersSent: true, lastReminderAt: true } },
        },
      },
    },
  });

  const run: ReminderRun = { checked: 0, due: 0, sent: 0, skipped: 0, dryRun: false };

  for (const mess of messes) {
    const due = dueDate(month, mess.dueDay);

    for (const student of mess.students) {
      run.checked++;

      const payment = student.payments[0] ?? null;
      const owes = owesForMonth({
        joinedAt: student.joinedAt,
        leftAt: student.leftAt,
        monthlyFee: student.monthlyFee,
        due,
      });
      if (!owes) continue;

      const wanted = shouldRemind({
        today,
        due,
        paid: payment?.paidAt != null,
        remindersSent: payment?.remindersSent ?? 0,
        lastReminderAt: payment?.lastReminderAt ?? null,
      });
      if (!wanted) continue;

      run.due++;

      const result = await sendSms(
        student.parentPhone,
        overdueMessage({
          studentName: student.name,
          amount: student.monthlyFee!,
          monthLabel: label,
          messName: mess.name,
        }),
      );

      if (!result.sent) {
        if (!result.configured) run.dryRun = true;
        run.skipped++;
        // The counter is deliberately not advanced. A message that never left
        // must not consume one of this month's two reminders, or the first real
        // run after the gateway is configured would find everyone "already
        // reminded" and send nothing at all.
        continue;
      }

      await prisma.payment.upsert({
        where: { studentId_month: { studentId: student.id, month } },
        create: {
          studentId: student.id,
          month,
          amount: student.monthlyFee,
          remindersSent: 1,
          lastReminderAt: now,
        },
        update: { remindersSent: { increment: 1 }, lastReminderAt: now },
      });
      run.sent++;
    }
  }

  return run;
}
