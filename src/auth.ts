import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { isAllowedEmail } from "@/lib/auth/allowlist";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    // magic-link only: OAuth token columns unused, so the narrower table is safe
    accountsTable: accounts as never,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM,
    }),
  ],
  pages: { signIn: "/signin" },
  callbacks: {
    signIn({ user }) {
      const email = user.email ?? "";
      const admins = (process.env.ADMIN_EMAILS ?? "")
        .toLowerCase()
        .split(",")
        .map((s) => s.trim());
      if (admins.includes(email.toLowerCase())) return true;
      return isAllowedEmail(email, process.env.ALLOWED_EMAIL_DOMAINS ?? "");
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});
