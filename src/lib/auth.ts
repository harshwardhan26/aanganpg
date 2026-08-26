import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import prisma from "./prisma";
import { resolveRole } from "./admin";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  providers: [
    // The only way in. Google costs nothing per sign-in, which SMS did not, and
    // it needs no DLT registration — the reason phone OTP was removed entirely.
    // It gives us an email and a name but never a phone, so AuthSheet demands the
    // number the moment they land back here — see `enquiryGate` in lib/session.ts.
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
      }
      // Recomputed from the allowlist on every call, never read back off the
      // token or the user row. Both adding and REMOVING an email take effect on
      // the next request. This is the single place admin is decided; every guard
      // in the app reads the `role` it sets.
      token.role = resolveRole(token.email);
      // A Google user has no phone until they give us one. `update({ name, phone })`
      // from the client lands here; without this the token keeps saying "no
      // phone" until the session expires and the capture sheet reopens forever.
      if (trigger === "update") {
        if (session?.phone) token.phone = session.phone;
        if (session?.name) token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.phone = token.phone as string | undefined;
        session.user.role = token.role as string;
      }
      return session;
    }
  }
};
