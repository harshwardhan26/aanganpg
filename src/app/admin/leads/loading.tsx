import { AdminSkeleton } from "../AdminSkeleton";

export default function AdminLeadsLoading() {
  return <AdminSkeleton label="Loading leads…" cards={5} />;
}
