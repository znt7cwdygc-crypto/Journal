import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountMode: user.accountMode,
          profileKind: user.profileKind,
          isAdultConfirmed: user.isAdultConfirmed
        };
      }
    })
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.accountMode = (user as { accountMode?: string }).accountMode;
        token.profileKind = (user as { profileKind?: string }).profileKind;
        token.isAdultConfirmed = (user as { isAdultConfirmed?: boolean }).isAdultConfirmed;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = String(token.sub);
        session.user.role = String(token.role ?? "USER") as never;
        session.user.accountMode = String(token.accountMode ?? "CONSUMER") as never;
        session.user.profileKind = String(token.profileKind ?? "MODEL") as never;
        session.user.isAdultConfirmed = Boolean(token.isAdultConfirmed ?? false);
      }
      return session;
    }
  }
});
