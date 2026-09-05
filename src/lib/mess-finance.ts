import type { FeeEntryKind } from "@prisma/client";

export type FeeEntryLike = {
  kind: FeeEntryKind;
  amount: number;
  reversedAt?: Date | null;
};

/** Positive values increase what is owed; negative values reduce it. */
export function feeEntryEffect(kind: FeeEntryKind, amount: number): number {
  if (!Number.isInteger(amount) || amount < 0) throw new Error("Fee entry amount must be a non-negative integer");
  switch (kind) {
    case "PAYMENT":
    case "DISCOUNT":
    case "CREDIT":
      return -amount;
    case "REFUND":
    case "EXTRA_CHARGE":
      return amount;
  }
}

export function feeBalance(charge: number | null, entries: FeeEntryLike[]): number {
  const startingCharge = charge ?? 0;
  return entries.reduce(
    (balance, entry) => balance + (entry.reversedAt ? 0 : feeEntryEffect(entry.kind, entry.amount)),
    startingCharge,
  );
}

export type FeeStatus = "NOT_SET" | "DUE" | "OVERDUE" | "PARTIAL" | "PAID" | "CREDIT";

/** How a fee status reads to an owner, in one place both fee screens share. */
export const FEE_STATUS_LABEL: Record<FeeStatus, string> = {
  NOT_SET: "Fee missing",
  DUE: "Due",
  OVERDUE: "Overdue",
  PARTIAL: "Part paid",
  PAID: "Paid",
  CREDIT: "Credit",
};

export function feeStatus(input: {
  charge: number | null;
  balance: number;
  due: Date;
  today: Date;
  hasPayment: boolean;
}): FeeStatus {
  if (input.charge === null) return "NOT_SET";
  if (input.balance < 0) return "CREDIT";
  if (input.balance === 0) return "PAID";
  if (input.hasPayment) return "PARTIAL";
  return input.today.getTime() >= input.due.getTime() ? "OVERDUE" : "DUE";
}

export function entryLabel(kind: FeeEntryKind): string {
  switch (kind) {
    case "PAYMENT": return "Payment";
    case "REFUND": return "Refund";
    case "DISCOUNT": return "Discount";
    case "EXTRA_CHARGE": return "Extra charge";
    case "CREDIT": return "Credit used";
  }
}

export function money(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString("en-IN")}`;
}

export function receiptNumber(counter: number, occurredAt: Date): string {
  const year = occurredAt.getUTCFullYear();
  return `AM-${year}-${String(counter).padStart(6, "0")}`;
}
