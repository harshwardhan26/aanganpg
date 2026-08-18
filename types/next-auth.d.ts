import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      phone?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    }
  }
  interface User {
    phone?: string;
    role?: string;
  }
}
