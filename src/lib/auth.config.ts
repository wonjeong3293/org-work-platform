import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { department: true, role: true },
        });

        if (!user || !user.isActive) return null;

        const isValid = await compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.profileImage,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            email: true,
            name: true,
            profileImage: true,
            position: true,
            isAdmin: true,
            department: { select: { id: true, name: true } },
            role: { select: { id: true, name: true, displayName: true } },
          },
        });
        if (dbUser) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const u = session.user as any;
          u.id = dbUser.id;
          u.name = dbUser.name;
          u.email = dbUser.email;
          u.image = dbUser.profileImage;
          u.position = dbUser.position;
          u.isAdmin = dbUser.isAdmin;
          u.department = dbUser.department;
          u.role = dbUser.role;
        }
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuth =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register");

      if (isOnAuth) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      if (!isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
  },
  session: {
    strategy: "jwt",
  },
};
