import "server-only";

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

type SupabasePasswordGrantUser = {
  id: string;
  email: string;
};

async function verifySupabasePassword(
  email: string,
  password: string,
): Promise<SupabasePasswordGrantUser | null> {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const userId = data?.user?.id;
    const userEmail = data?.user?.email;

    if (typeof userId !== "string" || typeof userEmail !== "string" || !userId || !userEmail) {
      return null;
    }

    return { id: userId, email: userEmail };
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const verified = await verifySupabasePassword(email, password);

        if (!verified) {
          return null;
        }

        return { id: verified.id, email };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
      }

      return token;
    },
    async session({ session, token }) {
      session.user = session.user ?? {};

      if (!session.user.email && typeof token.email === "string") {
        session.user.email = token.email;
      }

      return session;
    },
  },
};
