# Aangan Rooms 🏠

Aangan is a mobile-first student accommodation platform based in Kolhapur. We help students find actually verified PGs and rooms without brokerage, featuring a seamless discovery experience and robust owner lead generation.

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, v16.3)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/) (`@prisma/adapter-pg`)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) + Firebase (Phone OTP)
- **Rate Limiting**: Upstash Redis
- **Analytics & Tracking**: PostHog
- **Monitoring**: Sentry

## 🏗️ Architecture & Features

### Mobile-First UI/UX
The application is aggressively optimized for mobile (390px viewport baseline). 
- **Navigation**: Clean, uncluttered mobile navbar with contextual authentication buttons.
- **Search & Filters**: A highly interactive, mobile-optimized slide-up sheet (`SheetContent` from `@base-ui/react/dialog`) for complex property filtering (Budget, Gender, Occupancy, Mess, Amenities, Rules).

### Authentication & Gated Actions
We utilize a unified slide-up `AuthSheet` that intercepts user actions rather than redirecting them away from their current context. 
- **Phone OTP Verification**: Users log in via their Indian mobile number (+91) through Firebase Auth.
- **Gated Triggers**: Critical actions like "Call Aangan", "WhatsApp", "Leave a callback number", and "List your PG" are strictly gated. Unauthenticated clicks gracefully intercept the action, open the `AuthSheet`, and return the user precisely to where they were upon success.

### Property Management
- **Search System**: Robust filtering system powered by server-side query parameters tracking. 
- **Contact Routing**: All leads and contact clicks are recorded via Server Actions (`recordEnquiry`) and tracked in PostHog (`pg_contact_clicked`). All calls and WhatsApp messages route to the centralized Aangan operations number.

## 🛠️ Local Development

### Prerequisites
- Node.js (v20+)
- PostgreSQL Database
- Firebase Admin SDK credentials
- Upstash Redis credentials

### Setup Instructions

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Ensure your `.env` file is populated with the necessary keys (Database URL, NextAuth Secret, Firebase config, Upstash keys, etc.).
   
   Run the environment check script to verify:
   ```bash
   npm run env
   ```

3. **Database Setup**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Apply migrations
   npm run migrate:deploy
   
   # Seed the database (Colleges, demo rooms)
   npm run seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   Access the app at [http://localhost:3000](http://localhost:3000).

## 📋 Pre-Launch Smoke Checklist

Run this against the **preview URL** from a **real mobile phone**, not a desktop browser simulator.

1. **Clean Slate**: Seed a fresh database. Expect 15 colleges, 0 rooms.
2. **Admin Create**: Go to `/admin`. Create one real listing. Confirm that publishing is refused until the bathroom photo is attached.
3. **Core Journey**: Navigate Home -> College Page -> Search -> Listing Page.
4. **Action Buttons**: Confirm that "Call Owner", "WhatsApp", and "Share" all open native apps properly on your phone (while logged in).
5. **Auth Intercepts**: Verify that clicking contact buttons while logged out opens the Auth Sheet.
6. **The Parent Test**: Forward the WhatsApp share message to a second phone. Confirm it is readable and makes sense entirely on its own, without requiring the recipient to tap the link.
7. **Form Fallback**: Submit the Aangan fallback enquiry form twice for the same room. Check `/admin/leads` and confirm only **one** Lead row is generated.
8. **Performance Budget**: Run a Lighthouse Mobile test on `/` and `/search` with throttled 4G settings. Verify LCP < 2.5s and overall performance/accessibility scores meet target.
