This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Google Business Profile
Note: Google Business Profile is a manual task, not code. Ensure that the business profile is updated and maintained manually.

## Pre-Launch Smoke Checklist

Run this against the **preview URL** from a **real mobile phone**, not a desktop browser simulator.

1. **Clean Slate**: Seed a fresh database. Expect 15 colleges, 0 rooms.
2. **Admin Create**: Go to `/admin`. Create one real listing. Confirm that publishing is refused until the bathroom photo is attached.
3. **Core Journey**: Navigate Home -> College Page -> Search -> Listing Page.
4. **Action Buttons**: Confirm that "Call Owner", "WhatsApp", and "Share" all open native apps properly on your phone.
5. **The Parent Test**: Forward the WhatsApp share message to a second phone. Confirm it is readable and makes sense entirely on its own, without requiring the recipient to tap the link.
6. **Form Fallback**: Submit the Aangan fallback enquiry form twice for the same room. Check `/admin/leads` and confirm only **one** Lead row is generated.
7. **Performance Budget**: Run a Lighthouse Mobile test on `/` and `/pg/[slug]` with throttled 4G settings. Verify LCP < 2.5s and overall performance/accessibility scores meet target.
