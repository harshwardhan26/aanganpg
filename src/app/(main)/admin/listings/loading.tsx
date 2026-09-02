import { AdminSkeleton } from "../AdminSkeleton";

export default function AdminListingsLoading() {
  return <AdminSkeleton label="Loading listings…" cards={5} />;
}
