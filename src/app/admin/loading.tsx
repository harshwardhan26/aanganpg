import { AdminSkeleton } from "./AdminSkeleton";

export default function AdminHomeLoading() {
  return <AdminSkeleton label="Loading dashboard…" cards={2} />;
}
