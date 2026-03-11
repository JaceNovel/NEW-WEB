import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const nextAuthSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        pseudo: { label: "Pseudo", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const pseudo = (credentials?.pseudo ?? "").trim();
        const password = credentials?.password ?? "";

        if (!pseudo || !password) return null;

        const player = await prisma.player.findUnique({
          where: { pseudo },
          select: { id: true, pseudo: true, passwordHash: true, role: true, status: true, gameMode: true, credits: true, logoUrl: true, freefireId: true },
        });

        if (!player) return null;
        const ok = await bcrypt.compare(password, player.passwordHash);
        if (!ok) return null;

        return {
          id: player.id,
          name: player.pseudo,
          role: player.role,
          status: player.status,
          gameMode: player.gameMode,
          credits: player.credits,
          logoUrl: player.logoUrl,
          freefireId: player.freefireId,
        } as any;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.playerId = (user as any).id;
        token.role = (user as any).role;
        token.status = (user as any).status;
        token.gameMode = (user as any).gameMode;
        token.credits = (user as any).credits;
        token.logoUrl = (user as any).logoUrl;
        token.freefireId = (user as any).freefireId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const latestPlayer = token.playerId
          ? await prisma.player.findUnique({
              where: { id: String(token.playerId) },
              select: { credits: true, logoUrl: true, freefireId: true, status: true, gameMode: true },
            })
          : null;

        (session.user as any).id = token.playerId;
        (session.user as any).role = token.role;
        (session.user as any).status = latestPlayer?.status ?? token.status;
        (session.user as any).gameMode = latestPlayer?.gameMode ?? token.gameMode;
        (session.user as any).credits = latestPlayer?.credits ?? token.credits;
        (session.user as any).logoUrl = latestPlayer?.logoUrl ?? token.logoUrl;
        (session.user as any).freefireId = latestPlayer?.freefireId ?? token.freefireId;
      }
      return session;
    },
  },
};
