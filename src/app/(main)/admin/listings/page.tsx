import prisma from "@/lib/prisma";
import Link from "next/link";
import { Plus, Download, Search } from "lucide-react";
import {
  parseListingView,
  parseListingSearch,
  buildListingWhere,
  listingStatus,
  type ListingView,
  type ListingStatus,
} from "@/lib/listing-filters";
import { cn } from "@/lib/utils";
import { ReviewCodeButton } from "./ReviewCodeButton";
import { ListingActions } from "./ListingActions";

export const metadata = { title: "Listings" };

const PER_PAGE = 20;

const CHIPS: { view: ListingView; label: string }[] = [
  { view: "all", label: "All" },
  { view: "live", label: "Live" },
  { view: "draft", label: "Drafts" },
  { view: "full", label: "Full" },
  { view: "closed", label: "Closed" },
  { view: "deleted", label: "Deleted" },
];

/** Every pair is asserted at >= 4.5:1 in `scripts/selfcheck.ts`. */
const STATUS_STYLE: Record<ListingStatus, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-green-100 text-green-900" },
  draft: { label: "Draft", className: "bg-amber-100 text-amber-900" },
  full: { label: "Full", className: "bg-orange-100 text-orange-900" },
  closed: { label: "Closed", className: "bg-slate-200 text-slate-800" },
  deleted: { label: "Deleted", className: "bg-red-100 text-red-900" },
};

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminListingsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const view = parseListingView(searchParams.view);
  const search = parseListingSearch(searchParams.q);
  const page = Math.max(1, Number(searchParams.page) || 1);

  // eslint-disable-next-line react-hooks/purity
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const where = buildListingWhere(view, search);

  const [listings, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        college: true,
        _count: { select: { leads: { where: { createdAt: { gte: oneWeekAgo } } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.property.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  const href = (v: ListingView, p = 1) => {
    const params = new URLSearchParams();
    if (v !== "all") params.set("view", v);
    if (search) params.set("q", search);
    if (p > 1) params.set("page", String(p));
    return `/admin/listings${params.toString() ? `?${params}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-main">Listings</h1>
          <p className="mt-1 text-sm text-text-muted">
            {total} {total === 1 ? "listing" : "listings"}
            {pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Both reachable on a phone. Export CSV used to be `hidden
              sm:inline-block`, so the export simply did not exist below 640px. */}
          <a
            href="/api/admin/export/csv"
            className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-text-main hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export
          </a>
          <Link
            href="/admin/listings/new"
            className="flex min-h-11 items-center gap-2 rounded-lg bg-primary-strong px-4 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            New
          </Link>
        </div>
      </div>

      {/* A plain GET form — no client JS, and the search survives a reload
          because it lives in the URL like every other filter here. */}
      <form action="/admin/listings" method="get" className="flex gap-2">
        {view !== "all" && <input type="hidden" name="view" value={view} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search by title…"
            aria-label="Search listings by title"
            className="min-h-11 w-full rounded-lg border border-border bg-white pl-10 pr-3 text-text-main"
          />
        </div>
        <button
          type="submit"
          className="min-h-11 rounded-lg border border-border bg-white px-4 text-sm font-medium text-text-main hover:bg-slate-50"
        >
          Search
        </button>
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {CHIPS.map(({ view: v, label }) => {
          const active = v === view;
          return (
            <Link
              key={v}
              href={href(v)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                active
                  ? "border-primary-strong bg-primary-strong text-white"
                  : "border-border bg-white text-text-muted hover:border-text-muted",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {listings.length > 0 ? (
        <ul className="space-y-3">
          {listings.map((listing) => {
            const status = listingStatus(listing);
            const leadsThisWeek = listing._count.leads;
            const isDeleted = status === "deleted";
            const showWarning = status === "live" && leadsThisWeek < 1;

            return (
              // One card, at every width. The desktop table and the mobile card
              // list used to be two separate renderings of this data, and they
              // had already drifted apart.
              <li
                key={listing.id}
                className={cn(
                  "rounded-xl border border-border bg-white p-4",
                  isDeleted && "opacity-60",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/listings/${listing.id}/edit`}
                      className="font-heading text-base font-bold text-text-main hover:underline"
                    >
                      {listing.title}
                    </Link>
                    <p className="mt-1 text-sm text-text-muted">
                      {[
                        listing.college?.shortName || listing.college?.name,
                        listing.price ? `₹${listing.price.toLocaleString("en-IN")}` : null,
                        listing.location,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                      STATUS_STYLE[status].className,
                    )}
                  >
                    {STATUS_STYLE[status].label}
                  </span>
                </div>

                <p className="mt-2 flex items-center gap-2 text-sm text-text-muted">
                  {leadsThisWeek} {leadsThisWeek === 1 ? "lead" : "leads"} in 7 days
                  {showWarning && (
                    <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-bold text-orange-900">
                      Low
                    </span>
                  )}
                </p>

                {!isDeleted && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/listings/${listing.id}/edit`}
                      className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-slate-50 px-3 text-sm font-medium text-text-main hover:bg-slate-100"
                    >
                      Edit
                    </Link>
                    <ReviewCodeButton propertyId={listing.id} title={listing.title} />
                    <ListingActions
                      id={listing.id}
                      canMarkFull={status !== "full" && status !== "closed"}
                      canClose={status !== "closed"}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-border bg-white p-8 text-center text-text-muted">
          {search ? `Nothing matches “${search}”.` : "No listings in this view."}
        </p>
      )}

      {pageCount > 1 && (
        <nav aria-label="Listing pages" className="flex items-center justify-between gap-4 pt-2">
          {page > 1 ? (
            <Link
              href={href(view, page - 1)}
              rel="prev"
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-4 text-sm font-medium text-text-main hover:bg-slate-50"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-text-muted">
            {page} / {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={href(view, page + 1)}
              rel="next"
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-4 text-sm font-medium text-text-main hover:bg-slate-50"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
