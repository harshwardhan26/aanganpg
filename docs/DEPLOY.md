# Deploying Aangan Rooms

This guide walks through deploying a fresh instance from zero to a running
Vercel site. The same steps apply when adding a new team member's machine.

---

## 1. Create the hosted Postgres database

Use any provider that gives you a standard `postgres://` connection string with
a connection pool (≥ 10 connections). Neon, Supabase, Railway, and Render all
work.

> **Why not `prisma dev`?** The local dev server accepts exactly one connection
> at a time, so `Promise.all([getRooms(), getColleges()])` on the home page
> fails with Prisma error P1017 every time.

Copy the connection string — you will paste it as `DATABASE_URL` below.

---

## 2. Run migrations

Migrations live in `prisma/migrations/` and are applied with:

```bash
DATABASE_URL="postgres://…" npx prisma migrate deploy
```

Or, if your `.env` already has the URL:

```bash
npm run migrate:deploy
```

> **Never** use `migrate dev` or `db push` against a non-disposable database.
> Those commands may reset data. `migrate deploy` only applies pending
> migrations.

---

## 3. Create the Vercel project

```bash
npx -y vercel link          # follow the prompts to link or create the project
```

---

## 4. Add environment variables on Vercel

Use the Vercel dashboard (**Settings → Environment Variables**) or the CLI:

```bash
vercel env add DATABASE_URL production
vercel env add NEXT_PUBLIC_SITE_URL production   # e.g. https://aangan.in
```

Repeat for every variable listed below. The table tells you which are required
for a successful build and which degrade gracefully.

---

## 5. Environment variables reference

| Variable | Required for build? | Where the value comes from |
|---|---|---|
| `DATABASE_URL` | **Yes** | Hosted Postgres connection string (must accept concurrent connections) |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | Your production domain, e.g. `https://aangan.in` |
| `NEXTAUTH_URL` | No | Same as `NEXT_PUBLIC_SITE_URL` — NextAuth callback base |
| `NEXTAUTH_SECRET` | No | Run `openssl rand -base64 32` to generate |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | No | Firebase Console → Project Settings → Web app |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | No | Firebase Console → Project Settings → Web app |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | No | Firebase Console → Project Settings → Web app |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | No | Firebase Console → Project Settings → Web app |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | No | Firebase Console → Project Settings → Web app |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | No | Firebase Console → Project Settings → Web app |
| `FIREBASE_PROJECT_ID` | No | Firebase Console → Service Accounts |
| `FIREBASE_CLIENT_EMAIL` | No | Firebase Console → Service Accounts → JSON key |
| `FIREBASE_PRIVATE_KEY` | No | Firebase Console → Service Accounts → JSON key (keep `\n` escapes) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | No | Cloudinary Dashboard → Cloud name |
| `NEXT_PUBLIC_CLOUDINARY_PRESET` | No | Cloudinary Settings → Upload → Unsigned preset |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Console → REST API URL. Without it, OTP rate limiting is disabled. |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Console → REST API Token |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog → Project Settings → API key. Without it, analytics are disabled. |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | PostHog → Project Settings → Host (default `https://app.posthog.com`) |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry → Project Settings → Client Keys. Without it, error tracking is disabled. |
| `NEXT_PUBLIC_AANGAN_PHONE` | No | Aangan's public contact number |
| `ADMIN_PHONE` | No | E.164 formatted admin phone, e.g. `+919876543210` |

> **Note on Cloudinary Preset**: The `NEXT_PUBLIC_CLOUDINARY_PRESET` is an unsigned, public preset. You **must** configure it in the Cloudinary dashboard to cap file sizes (e.g., 5MB max), restrict formats (e.g., only `jpg`, `png`, `webp`), and ideally apply rate limits, to prevent abuse.

### Graceful degradation

| Missing variable group | Effect |
|---|---|
| Upstash (`UPSTASH_REDIS_*`) | OTP rate limiting disabled — the endpoint still works |
| PostHog (`NEXT_PUBLIC_POSTHOG_*`) | `trackEvent()` silently no-ops |
| Sentry (`NEXT_PUBLIC_SENTRY_DSN`) | Error reporting disabled |
| Firebase (`FIREBASE_*`, `NEXT_PUBLIC_FIREBASE_*`) | OTP login and admin auth break, but the public site loads |
| Cloudinary (`NEXT_PUBLIC_CLOUDINARY_*`) | Image uploads and transforms won't work |

---

## 6. Deploy

```bash
npx -y vercel --prod
```

Or push to the linked Git branch and let Vercel's Git integration handle it.

### What happens during a Vercel build

1. `npm install` → triggers `postinstall` → `prisma generate` (generates the
   Prisma Client for the build environment)
2. `next build` → `next.config.ts` throws if `NEXT_PUBLIC_SITE_URL` is unset

### Migrations are NOT run during the build

`prisma migrate deploy` must be run separately — either manually or via a CI
step — before deploying code that depends on new migrations. This prevents
accidental schema changes during a build.

```bash
# Before deploying a migration-bearing commit:
DATABASE_URL="postgres://…" npm run migrate:deploy
```

---

## 7. Verify the deployment

```bash
curl -sI https://your-domain.vercel.app/         | head -1   # 200
curl -sI https://your-domain.vercel.app/search    | head -1   # 200
curl -sI https://your-domain.vercel.app/kolhapur/kit-college | head -1  # 200
```

---

## 8. Local development

```bash
cp .env.example .env        # fill in at least DATABASE_URL and NEXT_PUBLIC_SITE_URL
npm install                  # postinstall runs prisma generate
npm run env                  # verify environment variables
npm run migrate:deploy       # apply migrations to your database
npm run dev                  # http://localhost:3000
```

To check your `.env` at any time:

```bash
npm run env
```
