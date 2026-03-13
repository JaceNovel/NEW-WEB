import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

let supportsWeeklyCreditsGrantedAt: boolean | null = null;

async function verifyConfiguredAdminPassword(password: string): Promise<boolean> {
  const adminPasswordHash = (process.env.ADMIN_PASSWORD_HASH ?? "").trim();
  if (adminPasswordHash) {
    return bcrypt.compare(password, adminPasswordHash);
  }

  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!adminPassword) {
    return false;
  }

  return password === adminPassword;
}

function matchesConfiguredAdminIdentifier(identifier: string): boolean {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  if (!normalizedIdentifier) {
    return false;
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const adminPseudo = (process.env.ADMIN_PSEUDO ?? "").trim().toLowerCase();

  return normalizedIdentifier === adminEmail || normalizedIdentifier === adminPseudo;
}

function isMissingWeeklyCreditsGrantedAtColumn(error: unknown): boolean {
  if (!error) return false;
  const message = String((error as any)?.message ?? error);
  return message.includes("Player.weeklyCreditsGrantedAt") && message.includes("does not exist");
}

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
        const identifier = (credentials?.pseudo ?? "").trim();
        const password = credentials?.password ?? "";

        if (!identifier || !password) return null;

        if (matchesConfiguredAdminIdentifier(identifier)) {
          const ok = await verifyConfiguredAdminPassword(password);
          if (!ok) return null;

          return {
            id: "admin-env",
            name: "Administrateur",
            role: "ADMIN",
            status: "PLAYER",
            gameMode: "ONETAP",
            credits: 0,
            logoUrl: "/pp1-removebg-preview (1).png",
            freefireId: "admin",
          } as any;
        }

        const player = await prisma.player.findFirst({
          where: {
            OR: [{ pseudo: identifier }, { email: identifier.toLowerCase() }],
          },
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
        const playerId = token.playerId ? String(token.playerId) : null;

        // ENV-admin is not stored in DB.
        if (playerId === "admin-env" && token.role === "ADMIN") {
          (session.user as any).id = token.playerId;
          (session.user as any).role = token.role;
          (session.user as any).status = token.status;
          (session.user as any).gameMode = token.gameMode;
          (session.user as any).credits = token.credits;
          (session.user as any).logoUrl = token.logoUrl;
          (session.user as any).freefireId = token.freefireId;
          return session;
        }

        let latestPlayer = null as null | {
          credits: number;
          weeklyCreditsGrantedAt?: Date | null;
          logoUrl: string;
          freefireId: string;
          status: any;
          gameMode: any;
        };

        if (playerId) {
          if (supportsWeeklyCreditsGrantedAt === false) {
            latestPlayer = await prisma.player.findUnique({
              where: { id: playerId },
              select: {
                credits: true,
                logoUrl: true,
                freefireId: true,
                status: true,
                gameMode: true,
              },
            });
          } else {
            try {
              latestPlayer = await prisma.player.findUnique({
                where: { id: playerId },
                select: {
                  credits: true,
                  weeklyCreditsGrantedAt: true,
                  logoUrl: true,
                  freefireId: true,
                  status: true,
                  gameMode: true,
                },
              });
              supportsWeeklyCreditsGrantedAt = true;
            } catch (error) {
              if (isMissingWeeklyCreditsGrantedAtColumn(error)) {
                supportsWeeklyCreditsGrantedAt = false;
              }
              // Backward compatible: production DB might not have weeklyCreditsGrantedAt yet.
              latestPlayer = await prisma.player.findUnique({
                where: { id: playerId },
                select: {
                  credits: true,
                  logoUrl: true,
                  freefireId: true,
                  status: true,
                  gameMode: true,
                },
              });
            }
          }
        }

        if (
          playerId &&
          latestPlayer &&
          latestPlayer.credits < 5 &&
          supportsWeeklyCreditsGrantedAt !== false &&
          "weeklyCreditsGrantedAt" in latestPlayer
        ) {
          const config = await prisma.tournamentConfig.findUnique({
            where: { id: "main" },
            select: { stage: true },
          });

          const isTournamentActive = config?.stage === "ACTIVE" || config?.stage === "FINALIZED";
          if (!isTournamentActive) {
            const now = Date.now();
            const last = latestPlayer.weeklyCreditsGrantedAt?.getTime() ?? 0;
            const hasWaitedSevenDays = now - last >= 7 * 24 * 60 * 60 * 1000;

            if (hasWaitedSevenDays) {
              try {
                latestPlayer = await prisma.player.update({
                  where: { id: playerId },
                  data: { credits: 5, weeklyCreditsGrantedAt: new Date() },
                  select: {
                    credits: true,
                    weeklyCreditsGrantedAt: true,
                    logoUrl: true,
                    freefireId: true,
                    status: true,
                    gameMode: true,
                  },
                });
                supportsWeeklyCreditsGrantedAt = true;
              } catch {
                // If column doesn't exist, skip weekly top-up.
                supportsWeeklyCreditsGrantedAt = false;
              }
            }
          }
        }

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
