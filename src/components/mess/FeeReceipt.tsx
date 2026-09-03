import { money } from "@/lib/mess-finance";

export type FeeReceiptData = {
  receiptNumber: string;
  messName: string;
  messAddress: string | null;
  contactPhone: string | null;
  studentName: string;
  monthLabel: string;
  amount: number;
  method: string | null;
  reference: string | null;
  receivedAt: Date;
  reversedAt: Date | null;
};

export function FeeReceipt({ receipt }: { receipt: FeeReceiptData }) {
  return (
    <article className="mx-auto max-w-xl rounded-2xl border-2 border-text-main bg-white p-6 text-text-main print:max-w-none print:border print:shadow-none">
      <header className="border-b-2 border-border pb-5 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-strong">Aangan Mess</p>
        <h1 className="mt-2 font-heading text-3xl font-bold">Payment receipt</h1>
        <p className="mt-1 text-sm text-text-muted">{receipt.receiptNumber}</p>
      </header>
      {receipt.reversedAt && <p className="mt-5 rounded-xl bg-red-50 p-4 text-center font-semibold text-red-900">This receipt was reversed and is no longer valid.</p>}
      <dl className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-4 text-base">
        <dt className="text-text-muted">Received from</dt><dd className="text-right font-semibold">{receipt.studentName}</dd>
        <dt className="text-text-muted">For</dt><dd className="text-right font-semibold">Mess fee · {receipt.monthLabel}</dd>
        <dt className="text-text-muted">Amount</dt><dd className="text-right font-heading text-2xl font-bold">{money(receipt.amount)}</dd>
        <dt className="text-text-muted">Method</dt><dd className="text-right font-semibold">{receipt.method ?? "Other"}</dd>
        {receipt.reference && <><dt className="text-text-muted">Reference</dt><dd className="break-all text-right font-semibold">{receipt.reference}</dd></>}
        <dt className="text-text-muted">Received on</dt><dd className="text-right font-semibold">{receipt.receivedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</dd>
      </dl>
      <footer className="mt-8 border-t-2 border-border pt-5">
        <p className="font-heading text-xl font-bold">{receipt.messName}</p>
        {receipt.messAddress && <p className="mt-1 text-sm text-text-muted">{receipt.messAddress}</p>}
        {receipt.contactPhone && <p className="text-sm text-text-muted">{receipt.contactPhone}</p>}
        <p className="mt-4 text-xs text-text-muted">Recorded by the mess through Aangan. Aangan did not collect or hold this money.</p>
      </footer>
    </article>
  );
}
