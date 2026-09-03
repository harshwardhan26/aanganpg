import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import {
  UtensilsCrossed,
  QrCode,
  CalendarCheck,
  Store,
  MessageCircle,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { publicImage } from "@/lib/publicImage";
import { MessNavbar } from "@/components/mess/MessNavbar";
import { MessLogin } from "@/components/mess/MessLogin";
import { AanganStrip } from "@/components/mess/AanganStrip";
import { MessFooter } from "@/components/mess/MessFooter";

export const metadata = {
  title: "Aangan Mess — your mess on your phone",
  description:
    "See today's food, mark your meal, and know what you owe. For students eating at a mess in Kolhapur.",
  robots: { index: true, follow: true },
  // Proves this host to Google Search Console, which is what lets us see why
  // Safe Browsing flagged the subdomain and ask for a review. On this page
  // rather than the shared root layout: the token belongs to the mess property,
  // and the room site has its own.
  verification: { google: "LO2TDwktK6qNh1zexQ5ES2oYvg95TJBS_4RIcsF5ySc" },
};

/**
 * mess.aanganpg.com — the front door.
 *
 * Marketing is only ever shown to a stranger. Anyone signed in is sent straight
 * to the screen they came for, because a student opening this on their phone at
 * lunchtime wants to mark a meal, not read about the product.
 *
 * The order of those checks is the same one `/my-mess` and the proxy use:
 * Aangan first, then staff, then the roll. It has to be, or "Mess" would mean
 * different things depending on which door you walked through.
 */
export default async function MessHome({
  searchParams,
}: {
  searchParams: Promise<{ as?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const { as, error } = await searchParams;

  // Aangan is deliberately NOT redirected. Sending the admin straight to the
  // console made the front door unreachable: typing the address and deleting
  // back to it lands on the console again, every time, so the one person who
  // needs to look at this page could never see it. The console is a link in the
  // bar instead.
  const isAdmin = session?.user?.role === "admin";

  if (userId && !isAdmin) {
    // A sign-in that did not complete, on a browser that is already signed in
    // as somebody. Redirecting now would drop this person on the previous
    // account's dashboard with no sign that anything failed — which is exactly
    // what the back button does to a spent Google link. Say it instead.
    if (error) {
      return (
        <div className="flex min-h-screen flex-col bg-white">
          <MessNavbar />
          <main className="mx-auto w-full max-w-md px-4 py-10">
            <h1 className="font-heading text-2xl font-bold text-text-main">
              That sign-in did not finish
            </h1>
            <div className="mt-4 rounded-2xl border-2 border-amber-800 bg-amber-50 p-5">
              <p className="text-base text-amber-900">
                You are still signed in as{" "}
                <span className="font-semibold">{session?.user?.email}</span>.
              </p>
              <p className="mt-2 text-base text-amber-900">
                To use a different account, sign out first. Going back in the browser opens a
                link Google has already used once, and it will fail every time.
              </p>
            </div>
            <Link
              href="/mess-home"
              className="mt-5 inline-flex min-h-14 items-center rounded-xl bg-primary-strong px-6 text-lg font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Carry on as {session?.user?.name ?? "me"}
            </Link>
          </main>
        </div>
      );
    }

    const member = await prisma.messMember.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (member) redirect("/mess");

    const email = session?.user?.email?.trim().toLowerCase();
    const student = email
      ? await prisma.student.findFirst({
          where: { email, leftAt: null },
          select: { messId: true },
          orderBy: { mess: { name: "asc" } },
        })
      : null;
    if (student) redirect(`/my-mess/${student.messId}`);

    // Signed in and on nobody's list. `/my-mess` already explains that, and
    // words it for whichever door they came through — so the answer has to
    // travel with them.
    redirect(as === "owner" || as === "student" ? `/my-mess?as=${as}` : "/my-mess");
  }

  const hero = publicImage("images/mess-hero.jpg");
  const phone = process.env.NEXT_PUBLIC_AANGAN_PHONE;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MessNavbar />

      <main>
        {/* HERO — photograph if we have one, a designed panel until then. */}
        <section
          className={`relative isolate flex flex-col justify-end overflow-hidden bg-dark lg:min-h-[560px] lg:justify-center ${
            hero ? "min-h-[72svh]" : "min-h-[58svh]"
          }`}
        >
          {hero ? (
            <Image
              src={hero}
              alt="A college mess hall, steel thalis laid out on the tables and food waiting at the serving counter"
              fill
              priority
              sizes="100vw"
              // The serving counter and the laid tables are the right two thirds
              // of the frame; a portrait crop centred would land on empty floor.
              className="object-cover object-[62%_center] lg:object-center"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#e05252] via-[#8f2b2b] to-[#0f172a]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/95 via-[#020617]/80 to-[#020617]/25" />

          <div className="relative mx-auto w-full max-w-[var(--content-max)] px-4 pt-24 pb-10 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-xl space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />
                Aangan Mess
              </span>

              <h1 className="font-heading text-4xl leading-[1.1] font-bold text-white sm:text-5xl lg:text-6xl">
                Your mess,
                <br />
                on your phone.
              </h1>
              <p className="text-base text-white/90 sm:text-lg">
                Today&apos;s food, your meals, your fees. Open it before you walk over.
              </p>

              {/* No sign-in button here. The bar already carries Login, and the
                  page has one at the end where a visitor has actually read what
                  they would be signing in to. */}
              {isAdmin && <ConsoleLink />}
            </div>
          </div>
        </section>

        <AanganStrip />

        {/* VALUE — three lines, the whole product. */}
        <section className="mx-auto max-w-[var(--content-max)] px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-6 sm:grid-cols-3">
            <Value
              icon={<UtensilsCrossed className="h-6 w-6" aria-hidden />}
              title="Know before you go"
              body="Today's menu, and the whole week ahead. No walking over to find out."
            />
            <Value
              icon={<QrCode className="h-6 w-6" aria-hidden />}
              title="Two seconds at the counter"
              body="Point your camera at the paper on the wall. Your name and photo come up."
            />
            <Value
              icon={<CalendarCheck className="h-6 w-6" aria-hidden />}
              title="No arguing about days"
              body="Every meal you ate is on your phone. So is every rupee you paid."
            />
          </div>
        </section>

        {/* FEATURES — one picture each. */}
        <section className="border-y border-border bg-light py-12 lg:py-20">
          <div className="mx-auto max-w-[var(--content-max)] px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-2xl font-bold text-text-main sm:text-3xl">
              What you get
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-5">
              <Feature
                file="images/mess-thali.jpg"
                alt="A full Maharashtrian thali on a steel plate"
                tint="from-amber-700 to-amber-900"
                title="Today's food"
                body="Breakfast, lunch and dinner, put up by your mess."
              />
              <Feature
                file="images/mess-scan.jpg"
                alt="A student holding a phone showing the mess scan screen"
                tint="from-[#cc4040] to-[#8f2b2b]"
                title="Mark your meal"
                body="Scan once. Your photo shows at the counter."
              />
              <Feature
                file="images/mess-counter.jpg"
                alt="A mess worker serving food to students at a counter"
                tint="from-emerald-700 to-emerald-900"
                title="Your fees"
                body="What is paid, what is left, which month."
              />
            </div>
          </div>
        </section>

        {/* HOW — the honest answer to "can I join a mess here?". */}
        <section className="mx-auto max-w-[var(--content-max)] px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="font-heading text-3xl font-bold text-text-main sm:text-4xl">
            How to start
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            <Step n={1} title="Your mess adds you" body="They put your Gmail on their list. You do nothing." />
            <Step
              n={2}
              title="Sign in with that Gmail"
              body="The same one. Google signs you in — we never see your password."
            />
            <Step n={3} title="Open it every day" body="Food, meals, fees. Nothing to install." />
          </ol>

          <div className="mt-10">{isAdmin ? <ConsoleLink /> : <MessLogin />}</div>
        </section>

        {/* OWNERS — one strip, not half the page. */}
        <section className="bg-text-main py-12 lg:py-16">
          <div className="mx-auto flex max-w-[var(--content-max)] flex-col items-start gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div className="max-w-xl">
              <h2 className="flex items-center gap-3 font-heading text-2xl font-bold text-white sm:text-3xl">
                <Store className="h-7 w-7 shrink-0" aria-hidden />
                Run a mess?
              </h2>
              <p className="mt-2 text-base text-white/80">
                200 students, no notebook. Attendance, fees and the food menu in one place.
              </p>
            </div>
            {phone && (
              <a
                href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                className="inline-flex min-h-14 shrink-0 items-center gap-2 rounded-xl bg-white px-7 text-lg font-semibold text-text-main transition-colors hover:bg-slate-100"
              >
                <MessageCircle className="h-5 w-5" aria-hidden />
                Talk to Aangan
              </a>
            )}
          </div>
        </section>
      </main>

      <MessFooter />
    </div>
  );
}

function ConsoleLink() {
  return (
    <Link
      href="/mess-admin"
      className="inline-flex min-h-14 items-center rounded-xl bg-primary-strong px-7 text-lg font-semibold text-white transition-colors hover:bg-primary-hover"
    >
      Open console
    </Link>
  );
}

function Value({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-primary-strong">
        {icon}
      </span>
      <h3 className="font-heading text-xl font-bold text-text-main">{title}</h3>
      <p className="text-base text-text-muted">{body}</p>
    </div>
  );
}

/**
 * A feature card whose photograph may not exist yet.
 *
 * `publicImage` returns null until the file lands in `public/images`, and the
 * slot renders as its own tinted panel rather than a broken image or somebody
 * else's stock food.
 *
 * A row on a phone and a column from `sm` up. Three tall photo cards stacked
 * made a student scroll past half a screen each to read one line of text; the
 * thumbnail says the same thing in a fifth of the height. The floating icon
 * badge is gone — the icons already appear, larger, in the section above, and a
 * decoration repeated twice on one page is decoration nobody reads.
 */
function Feature({
  file,
  alt,
  tint,
  title,
  body,
}: {
  file: string;
  alt: string;
  tint: string;
  title: string;
  body: string;
}) {
  const src = publicImage(file);

  return (
    <article className="flex items-center gap-4 rounded-2xl border border-border bg-white p-3 transition-colors duration-200 hover:border-slate-300 sm:flex-col sm:items-stretch sm:gap-0 sm:overflow-hidden sm:p-0">
      <div className="relative isolate h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:aspect-[4/3] sm:h-auto sm:w-full sm:rounded-none">
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(min-width: 640px) 33vw, 80px"
            className="object-cover object-center"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${tint}`} />
        )}
      </div>
      <div className="min-w-0 sm:p-4">
        <h3 className="font-heading text-base font-bold text-text-main">{title}</h3>
        <p className="mt-0.5 text-sm leading-relaxed text-text-muted">{body}</p>
      </div>
    </article>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="rounded-2xl border border-border bg-white p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-strong font-heading text-lg font-bold text-white">
        {n}
      </span>
      <h3 className="mt-3 font-heading text-lg font-bold text-text-main">{title}</h3>
      <p className="mt-1 text-base text-text-muted">{body}</p>
    </li>
  );
}
