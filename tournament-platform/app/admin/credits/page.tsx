import AdminCreditsManager from "@/components/admin/AdminCreditsManager";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCreditsPage() {
  const alliances = await prisma.player.findMany({
    where: {
      recruitedPlayers: {
        some: { alliancePending: false },
      },
    },
    select: {
      id: true,
      pseudo: true,
      freefireId: true,
      credits: true,
      recruitedPlayers: {
        where: { alliancePending: false },
        select: {
          id: true,
          pseudo: true,
          freefireId: true,
        },
      },
    },
    orderBy: [{ credits: "desc" }, { updatedAt: "desc" }],
  });

  return <AdminCreditsManager initialAlliances={safeJson(alliances)} />;
}