/**
 * The pure half of the mess module.
 *
 * Everything here is string and date work with no database and no session, so
 * client components can import it and `scripts/selfcheck.ts` can assert on it.
 * The guards that need a session live in `src/actions/mess.ts`.
 */

import { startOfIstDay } from './lead-filters';

export type MessRoleName = 'OWNER' | 'STAFF';

/**
 * Whether a membership row is allowed to do something.
 *
 * One rule, in one place: an owner can do anything staff can, and staff cannot
 * do owner-only work. Written as a comparison rather than a list of `if`s so
 * adding a third role later is one entry, not a new branch in every caller.
 */
const RANK: Record<MessRoleName, number> = { STAFF: 1, OWNER: 2 };

export function messRoleAllows(
  held: MessRoleName | null | undefined,
  required: MessRoleName,
): boolean {
  if (!held) return false;
  return RANK[held] >= RANK[required];
}

/** The day an attendance row is filed under. Midnight IST, stored as UTC. */
export function attendanceDay(now: Date): Date {
  return startOfIstDay(now);
}

/**
 * The last `count` days, oldest first, for the dashboard's recent-days strip.
 *
 * Built by subtracting whole days from the IST midnight rather than from `now`,
 * so a run at 00:30 IST does not silently produce yesterday's list.
 */
export function recentDays(now: Date, count: number): Date[] {
  const today = startOfIstDay(now);
  const days: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    days.push(new Date(today.getTime() - i * 24 * 60 * 60 * 1000));
  }
  return days;
}

/**
 * How long until the mess day rolls over.
 *
 * The check-in tablet stays on one page for weeks, so nothing ever re-renders
 * it on its own. At 00:00 IST the server starts filing scans under a new day
 * while the screen still shows yesterday's ticks — tapping a student who "looks
 * present" would then mark them present for today, which is the opposite of
 * what the person tapping intended. A page that reloads on the boundary has no
 * such gap.
 */
export function msUntilNextIstDay(now: Date): number {
  const nextDay = startOfIstDay(now).getTime() + 24 * 60 * 60 * 1000;
  // IST midnight in UTC terms is 18:30 the previous day, which is what
  // startOfIstDay already accounts for; this only has to close the gap.
  return nextDay - (now.getTime() + 5.5 * 60 * 60 * 1000);
}

/** `2026-09-02` — the key both the query and the render agree on. */
export function dayKey(day: Date): string {
  return day.toISOString().slice(0, 10);
}

/** `Wed 2` — a day label short enough for a phone-width strip. */
export function dayLabel(day: Date): string {
  return day.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * What the student form accepted, or the reason it did not.
 *
 * Returns a list rather than throwing on the first problem: a form that reports
 * one error at a time makes the person fill it in three times.
 */
export function studentFormIssues(input: {
  name: string;
  monthlyFee: number | null;
  parentPhone: string | null;
  parentPhoneRaw: string;
  email?: string;
}): string[] {
  const issues: string[] = [];

  // Shape only. It cannot catch `gmai.com` for `gmail.com` — that typo is a
  // valid address for a domain that exists — which is why the students list
  // shows the email back, and why it can be edited afterwards. This only stops
  // the entries that could never work at all.
  const email = input.email?.trim() ?? "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    issues.push("Email does not look like an email address.");
  }

  if (!input.name.trim()) issues.push('Name is needed.');
  if (input.name.trim().length > 80) issues.push('Name is too long.');

  // `null` from a non-empty box means the number was not a mobile number. An
  // empty box is a student whose parent we simply do not have — allowed.
  if (input.parentPhoneRaw.trim() && !input.parentPhone) {
    issues.push('Parent phone is not a valid mobile number.');
  }

  // `!== null` deliberately: a fee of 0 is a real answer and must not read as
  // absent the way `!input.monthlyFee` would.
  if (input.monthlyFee !== null && (input.monthlyFee < 0 || input.monthlyFee > 100000)) {
    issues.push('Monthly fee looks wrong.');
  }

  return issues;
}

// --- Meals -----------------------------------------------------------------

export type MealName = "BREAKFAST" | "LUNCH" | "DINNER";

/**
 * When each meal is served, in IST minutes from midnight.
 *
 * A constant, not a per-mess setting: one mess is running this, and three
 * columns nobody has yet asked to change differently is a settings screen built
 * for an imaginary second customer. When a second mess disagrees, this moves to
 * the `Mess` row and the callers do not change.
 *
 * The windows are deliberately generous at the edges — a student arriving ten
 * minutes after the counter closes is still eating lunch, and a scan that lands
 * on no meal at all is a support call.
 */
export const MEAL_WINDOWS: { meal: MealName; from: number; to: number; label: string }[] = [
  { meal: "BREAKFAST", from: 6 * 60 + 30, to: 11 * 60, label: "Breakfast" },
  { meal: "LUNCH", from: 11 * 60, to: 16 * 60, label: "Lunch" },
  { meal: "DINNER", from: 18 * 60, to: 23 * 60 + 30, label: "Dinner" },
];

export const MEAL_LABEL: Record<MealName, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

/** Minutes past midnight IST. */
function istMinutes(now: Date): number {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

/**
 * Which meal is being served right now, or null between meals.
 *
 * Null is a real answer and callers must handle it: a student scanning at 5pm
 * is told no meal is being served rather than being quietly filed under dinner,
 * which would let one scan cover a meal they never came to.
 */
export function mealAt(now: Date): MealName | null {
  const minutes = istMinutes(now);
  const window = MEAL_WINDOWS.find((w) => minutes >= w.from && minutes < w.to);
  return window?.meal ?? null;
}

/** The meal a staff member is most likely marking, for the check-in screen. */
export function nearestMeal(now: Date): MealName {
  const current = mealAt(now);
  if (current) return current;

  const minutes = istMinutes(now);
  // Before breakfast or after dinner both mean "the next one to be served".
  if (minutes < MEAL_WINDOWS[0].from) return "BREAKFAST";
  const upcoming = MEAL_WINDOWS.find((w) => minutes < w.from);
  return upcoming?.meal ?? "DINNER";
}

// --- Menu ------------------------------------------------------------------

export const WEEKDAY_LABEL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** 0 = Sunday, matching `Date.getUTCDay()` on an IST-midnight date. */
export function weekdayOf(day: Date): number {
  return day.getUTCDay();
}

export type MenuRow = {
  weekday: number | null;
  date: Date | null;
  meal: MealName;
  items: string;
};

/**
 * What is being served for one meal on one day.
 *
 * A one-off row for this exact date beats the weekly rotation, because the
 * reason anyone writes one is that today is different. Returns null when
 * nothing is set, which the screen shows as "not put up yet" rather than as an
 * empty plate — a blank menu is a mess that has not typed it in, not a mess
 * serving nothing.
 */
export function menuFor(rows: MenuRow[], day: Date, meal: MealName): string | null {
  const dayKeyValue = dayKey(day);

  const override = rows.find(
    (row) => row.meal === meal && row.date !== null && dayKey(row.date) === dayKeyValue,
  );
  if (override) return override.items;

  const weekly = rows.find(
    (row) => row.meal === meal && row.date === null && row.weekday === weekdayOf(day),
  );
  return weekly?.items ?? null;
}

// --- Fees and reminders (Phase G) -----------------------------------------

/** The first of the month a date falls in, on the same IST boundary as a day. */
export function startOfIstMonth(now: Date): Date {
  const day = startOfIstDay(now);
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
}

/** `2026-09` — the key a billing month is addressed by. */
export function monthKey(month: Date): string {
  return month.toISOString().slice(0, 7);
}

/** `September 2026` — how a month is written to a person. */
export function monthLabel(month: Date): string {
  return month.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The date a month's fee turns overdue.
 *
 * A `dueDay` past the end of a short month lands on the last day of that month
 * rather than spilling into the next one — a mess that collects on the 31st
 * must still chase people in February, and `new Date(y, 1, 31)` silently
 * becoming 3 March would let two days of February go unchased every year.
 */
export function dueDate(month: Date, dueDay: number): Date {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const day = Math.min(Math.max(1, Math.trunc(dueDay)), lastDay);
  return new Date(Date.UTC(year, monthIndex, day));
}

/** How many reminders one unpaid month is ever worth. */
export const MAX_REMINDERS = 2;

/** Days between the first reminder and the second. */
export const REMINDER_GAP_DAYS = 5;

/**
 * Whether a parent should be texted today about an unpaid month.
 *
 * All of the reminder policy is here, in one pure function, because the policy
 * is the part that will be argued about — "stop after two" and "five days
 * apart" are business decisions, and a business decision buried in a database
 * query is one nobody can find or test.
 */
export function shouldRemind(input: {
  today: Date;
  due: Date;
  paid: boolean;
  remindersSent: number;
  lastReminderAt: Date | null;
}): boolean {
  if (input.paid) return false;
  // Not yet due is not late. `<` not `<=`: the fee is due ON the due date, so
  // chasing someone that morning is chasing them early.
  if (input.today.getTime() < input.due.getTime()) return false;
  if (input.remindersSent >= MAX_REMINDERS) return false;
  if (input.remindersSent === 0) return true;
  if (!input.lastReminderAt) return true;

  const gap = input.today.getTime() - startOfIstDay(input.lastReminderAt).getTime();
  return gap >= REMINDER_GAP_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Whether this student owes anything for this month at all.
 *
 * A student who joined after the due date is not chased for a month they were
 * barely present for, and a student with no fee on file is not chased for an
 * amount nobody has decided. Note `=== null`, not falsy: a fee of 0 is a real
 * answer and such a student is simply never overdue.
 */
export function owesForMonth(input: {
  joinedAt: Date;
  leftAt: Date | null;
  monthlyFee: number | null;
  due: Date;
}): boolean {
  if (input.monthlyFee === null) return false;
  if (input.monthlyFee === 0) return false;
  if (input.joinedAt.getTime() > input.due.getTime()) return false;
  if (input.leftAt && input.leftAt.getTime() < input.due.getTime()) return false;
  return true;
}

/** Present today, out of the students still on the rolls. */
export function attendanceSummary(present: number, active: number) {
  return {
    present,
    absent: Math.max(0, active - present),
    // Guard the divide: a mess with no students yet is 0%, not NaN%.
    percent: active === 0 ? 0 : Math.round((present / active) * 100),
  };
}
