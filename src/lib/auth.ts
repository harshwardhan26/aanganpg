import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import { canonicalPhone } from "./phone";


export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  providers: [
    CredentialsProvider({
      name: "OTP Auth",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) return null;

        const phone = canonicalPhone(credentials.phone);
        if (!phone) return null;

        // Test admin bypass
        if (process.env.NODE_ENV === "development" && credentials.code === "123456" && phone === "+919999999999") {
          const testPhone = process.env.ADMIN_PHONE || "9999999999";
          let user = await prisma.user.findUnique({ where: { phone: testPhone } });
          if (!user) {
            user = await prisma.user.create({
              data: { phone: testPhone, role: "admin" },
            });
          }
          return { id: user.id, phone: user.phone || undefined, role: user.role };
        }

        try {
          // Find valid OTP
          const validOtp = await prisma.otpCode.findFirst({
            where: {
              phone,
              code: credentials.code,
              expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: "desc" }
          });

          if (!validOtp) return null;

          // Delete all OTPs for this phone so they can't be reused
          await prisma.otpCode.deleteMany({
            where: { phone }
          });
          
          let user = await prisma.user.findUnique({ where: { phone } });
          
          if (!user) {
            user = await prisma.user.create({
              data: { phone, role: "student" },
            });
          }
          return { id: user.id, phone: user.phone || undefined, role: user.role };
        } catch (e) {
          console.error("Auth error:", e);
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
        // Role is threaded to the session for future role-based checks. 
        // Currently, all new users are assigned 'student', so admin guards
        // still rely on the ADMIN_PHONE env var.
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.phone = token.phone as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  }
};
