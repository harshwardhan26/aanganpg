import Link from "next/link";
import { MessForm } from "./MessForm";

export const metadata = { title: "Add a mess" };

export default function NewMessPage() {
  return (
    <div className="mx-auto max-w-md">
      <Link
        href="/mess-admin"
        className="inline-flex min-h-11 items-center text-base font-medium text-primary-strong underline underline-offset-4"
      >
        ← Back
      </Link>

      <h1 className="mt-2 font-heading text-2xl font-bold text-text-main">Add a mess</h1>
      <p className="mt-1 mb-6 text-base text-text-muted">
        The owner gets full access: students, attendance, fees and the food menu.
      </p>

      <MessForm />
    </div>
  );
}
