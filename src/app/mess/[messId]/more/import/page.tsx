import { requireMessOwner } from "@/actions/mess";
import { ImportForm } from "./ImportForm";

export const metadata = { title: "Import students" };

export default async function ImportPage({ params }: { params: Promise<{ messId: string }> }) {
  const { messId } = await params;
  await requireMessOwner(messId);
  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-text-main">Import students</h1>
      <p className="mt-1 text-base text-text-muted">
        Upload up to 1,000 students. The whole file is checked before anything is saved.
      </p>
      <section className="mt-5 rounded-2xl bg-muted p-5">
        <h2 className="font-heading text-lg font-bold text-text-main">Columns</h2>
        <p className="mt-2 text-sm text-text-muted">
          <strong>Name</strong> is required. Optional columns: Email, Parent Name, Parent Phone, and
          Monthly Fee.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Example:{" "}
          <code className="rounded bg-white px-1.5 py-0.5">Name,Email,Parent Phone,Fee</code>
        </p>
      </section>
      <ImportForm messId={messId} />
    </div>
  );
}
