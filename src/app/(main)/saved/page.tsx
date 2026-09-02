import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { RoomCard } from "@/components/RoomCard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved Rooms | Aangan",
};

export default async function SavedPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <main className="min-h-screen bg-light py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center space-y-6 pt-20">
          <h1 className="text-3xl font-bold text-text-main font-heading">Log in to see saved rooms</h1>
          <p className="text-text-muted">Tap the heart icon on any room to save it here.</p>
        </div>
      </main>
    );
  }

  const savedProperties = await prisma.savedProperty.findMany({
    where: { userId: session.user.id },
    include: {
      property: {
        include: { college: true, images: true },
      },
    },
    orderBy: { property: { createdAt: "desc" } },
  });

  const rooms = savedProperties.map(s => s.property).filter(p => !p.deletedAt);

  return (
    <main className="min-h-screen bg-light py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[var(--content-max)] mx-auto">
        <h1 className="text-2xl font-bold font-heading text-text-main mb-6">Saved Rooms</h1>
        
        {rooms.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-border">
            <p className="text-text-muted text-lg">You haven&apos;t saved any rooms yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map(room => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
