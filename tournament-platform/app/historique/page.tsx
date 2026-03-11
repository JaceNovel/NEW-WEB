import HistoryArena from "@/components/HistoryArena";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HistoriquePage() {
  const hasDb = Boolean(process.env.DATABASE_URL);

  const matches = hasDb
    ? await prisma.match.findMany({
        where: { status: "FINISHED", winnerId: { not: null } },
        orderBy: [{ date: "desc" }],
        take: 15,
        include: {
          player1: { select: { id: true, pseudo: true, freefireId: true, countryCode: true, logoUrl: true } },
          player2: { select: { id: true, pseudo: true, freefireId: true, countryCode: true, logoUrl: true } },
        },
      })
    : [];

  return <HistoryArena matches={safeJson(matches)} />;
}