import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { adminAuth } from "./firebase-admin";
import prisma from "./prisma";
import { canonicalPhone } from "./phone";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  providers: [
    CredentialsProvider({
      name: "Firebase OTP",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) return null;
        try {
          const decodedToken = await adminAuth.verifyIdToken(credentials.idToken);
          if (!decodedToken.phone_number) return null;
          
          const phone = canonicalPhone(decodedToken.phone_number);
          if (!phone) return null;
          let user = await prisma.user.findUnique({ where: { phone } });
          
          if (!user) {
            user = await prisma.user.create({
              data: { phone, role: "student" },
            });
          }
          return { id: user.id, phone: user.phone || undefined, role: user.role };
        } catch (e) {
          console.error("Firebase auth error:", e);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.phone = token.phone as string;
      }
      return session;
    }
  }
};
