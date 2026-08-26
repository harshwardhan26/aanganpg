import type { Prisma } from "@prisma/client";

/**
 * Recompute a listing's denormalised rating from its reviews.
 *
 * Called after every write that can change them — a review created, a review
 * deleted — so `Property.ratingAvg` and `Property.ratingCount` are never stale
 * for longer than the transaction that changed them.
 *
 * Takes a client so it can run inside `$transaction` alongside the write it
 * follows; passing the plain client works too and is what the delete path does.
 *
 * ponytail: recomputes with an aggregate rather than adjusting the running
 * average by hand. Two extra queries per review write is nothing at review
 * volumes, and an incremental average is the kind of arithmetic that drifts
 * silently. Revisit only if reviews ever become a hot write path.
 */
export async function syncPropertyRating(
  db: Prisma.TransactionClient,
  propertyId: string,
): Promise<{ average: number; count: number }> {
  const result = await db.review.aggregate({
    where: { propertyId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const count = result._count.rating || 0;
  const average = count > 0 ? result._avg.rating ?? 0 : 0;

  await db.property.update({
    where: { id: propertyId },
    data: { ratingAvg: count > 0 ? average : null, ratingCount: count },
  });

  return { average, count };
}
