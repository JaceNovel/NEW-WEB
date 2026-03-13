import { TournamentStage } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { sendRoiApprovedEmail, sendRoiReplacementEmails } from "@/lib/email-notifications";
import { prisma } from "@/lib/prisma";
import { getTournamentConfig, recalculateTournamentState, splitTournamentPools } from "@/lib/tournament";

export default async function AdminTournamentManager({ compact = false }: { compact?: boolean }) {
  async function ensureAdmin() {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      redirect("/");
    }
  }

  async function revalidateTournamentPages() {
    "use server";
    revalidatePath("/admin/tournoi");
    revalidatePath("/admin/classement");
    revalidatePath("/admin");
    revalidatePath("/classement");
  }

  async function recalcAction() {
    "use server";
    await ensureAdmin();
    await recalculateTournamentState();
    await revalidateTournamentPages();
  }

  async function resetAction() {
    "use server";
    await ensureAdmin();

    await prisma.$transaction(async (tx) => {
      await tx.match.deleteMany();
      await tx.challenge.deleteMany();
      await tx.player.updateMany({
        data: {
          credits: 5,
          wins: 0,
          losses: 0,
          status: "PLAYER",
          isSeededTop10: false,
          seededTop20At: null,
          finalRank: null,
        },
      });
      await tx.tournamentConfig.upsert({
        where: { id: "main" },
        update: {
          registrationLimit: 20,
          stage: TournamentStage.REGISTRATION,
          activeRoiId: null,
          lockedAt: null,
          startedAt: null,
          finalizedAt: null,
        },
        create: {
          id: "main",
          registrationLimit: 20,
          stage: TournamentStage.REGISTRATION,
        },
      });
    });

    await recalculateTournamentState();
    await revalidateTournamentPages();
  }

  async function setRoiAction(formData: FormData) {
    "use server";
    await ensureAdmin();

    const activeRoiId = String(formData.get("activeRoiId") ?? "").trim();
    if (!activeRoiId) return;

    const previousConfig = await getTournamentConfig();
    const startedAt = new Date();

    await prisma.$transaction(async (tx) => {
      const tournamentPlayers = await tx.player.findMany({
        where: { role: "PLAYER" },
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          createdAt: true,
          seededTop20At: true,
        },
      });

      const { top20Pool } = splitTournamentPools(tournamentPlayers, previousConfig.registrationLimit);
      const candidateIds = top20Pool.map((player) => player.id);

      if (!candidateIds.includes(activeRoiId)) {
        throw new Error("Le ROI doit être choisi parmi les inscrits actuellement retenus dans le top 20.");
      }

      await tx.player.updateMany({
        where: {
          id: { in: candidateIds },
          seededTop20At: null,
        },
        data: { seededTop20At: previousConfig.lockedAt ?? startedAt },
      });

      await tx.tournamentConfig.upsert({
        where: { id: "main" },
        update: {
          stage: TournamentStage.ACTIVE,
          activeRoiId,
          startedAt,
          lockedAt: previousConfig.lockedAt ?? startedAt,
        },
        create: {
          id: "main",
          stage: TournamentStage.ACTIVE,
          activeRoiId,
          startedAt,
          lockedAt: startedAt,
        },
      });
      await tx.player.update({
        where: { id: activeRoiId },
        data: { isSeededTop10: true },
      });
      await recalculateTournamentState(tx);
    });

    if (previousConfig.activeRoiId !== activeRoiId) {
      const roiPlayers = await prisma.player.findMany({
        where: {
          id: {
            in: [activeRoiId, previousConfig.activeRoiId].filter(Boolean) as string[],
          },
        },
        select: {
          id: true,
          pseudo: true,
          email: true,
        },
      });

      const nextRoi = roiPlayers.find((player) => player.id === activeRoiId) ?? null;
      const previousRoi = previousConfig.activeRoiId
        ? roiPlayers.find((player) => player.id === previousConfig.activeRoiId) ?? null
        : null;

      if (nextRoi) {
        const stamp = startedAt.toISOString();
        void (previousRoi
          ? sendRoiReplacementEmails({
              dethroned: previousRoi,
              nextRoi,
              dethronedEventKey: `roi-dethroned:${previousRoi.id}:${nextRoi.id}:${stamp}`,
              announcementEventKey: `roi-replaced:${previousRoi.id}:${nextRoi.id}:${stamp}`,
            })
          : sendRoiApprovedEmail({
              eventKey: `roi-approved:${nextRoi.id}:${stamp}`,
              roi: nextRoi,
            })
        ).catch((error) => {
          console.error("[admin-tournament] ROI email failed", error);
        });
      }
    }

    await revalidateTournamentPages();
  }

  async function setTop10Action(formData: FormData) {
    "use server";
    await ensureAdmin();

    const config = await getTournamentConfig();
    const selectedIds = formData
      .getAll("top10")
      .map((value) => String(value))
      .filter(Boolean);

    const tournamentPlayers = await prisma.player.findMany({
      where: { role: "PLAYER" },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        createdAt: true,
        seededTop20At: true,
      },
    });

    const { top20Pool } = splitTournamentPools(tournamentPlayers, config.registrationLimit);
    const top20Ids = top20Pool.map((player) => player.id);
    const requiredTop10Count = Math.min(10, top20Ids.length);

    if (
      !config.activeRoiId ||
      !top20Ids.includes(config.activeRoiId) ||
      !selectedIds.includes(config.activeRoiId) ||
      selectedIds.length !== requiredTop10Count ||
      selectedIds.some((id) => !top20Ids.includes(id))
    ) {
      throw new Error(`Le top prioritaire doit contenir exactement ${requiredTop10Count} joueurs et inclure le ROI.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.player.updateMany({
        where: {
          id: { in: top20Ids },
          seededTop20At: null,
        },
        data: { seededTop20At: config.lockedAt ?? new Date() },
      });

      await tx.player.updateMany({
        where: { id: { in: top20Ids } },
        data: { isSeededTop10: false },
      });
      await tx.player.updateMany({
        where: { id: { in: selectedIds } },
        data: { isSeededTop10: true },
      });
    });

    await revalidateTournamentPages();
  }

  async function finalizeTop20Action(formData: FormData) {
    "use server";
    await ensureAdmin();

    const previousConfig = await getTournamentConfig();

    const tournamentPlayers = await prisma.player.findMany({
      where: { role: "PLAYER" },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        createdAt: true,
        seededTop20At: true,
      },
    });

    const { top20Pool } = splitTournamentPools(tournamentPlayers, previousConfig.registrationLimit);
    const top20Ids = top20Pool.map((player) => player.id);
    const expectedCount = top20Ids.length;

    const entries = Array.from(formData.entries()).filter(([key]) => key.startsWith("rank-"));
    const rankAssignments = entries
      .map(([key, value]) => ({
        playerId: key.replace("rank-", ""),
        rank: Number.parseInt(String(value), 10),
      }))
      .filter((entry) => Number.isFinite(entry.rank) && top20Ids.includes(entry.playerId));

    const rankSet = new Set(rankAssignments.map((entry) => entry.rank));
    if (
      rankAssignments.length !== expectedCount ||
      rankSet.size !== expectedCount ||
      [...rankSet].some((rank) => rank < 1 || rank > expectedCount)
    ) {
      throw new Error(`Attribue un rang unique de 1 à ${expectedCount} à chaque joueur retenu dans le top 20 actuel.`);
    }

    const roiRank = rankAssignments.find((entry) => entry.rank === 1)?.playerId ?? null;

    await prisma.$transaction(async (tx) => {
      const finalizedAt = new Date();
      await tx.player.updateMany({
        where: {
          id: { in: top20Ids },
          seededTop20At: null,
        },
        data: { seededTop20At: previousConfig.lockedAt ?? finalizedAt },
      });

      for (const assignment of rankAssignments) {
        await tx.player.update({
          where: { id: assignment.playerId },
          data: { finalRank: assignment.rank },
        });
      }

      await tx.tournamentConfig.upsert({
        where: { id: "main" },
        update: {
          stage: TournamentStage.FINALIZED,
          finalizedAt,
          activeRoiId: roiRank,
        },
        create: {
          id: "main",
          stage: TournamentStage.FINALIZED,
          finalizedAt,
          activeRoiId: roiRank,
        },
      });
      await recalculateTournamentState(tx);
    });

    if (roiRank && previousConfig.activeRoiId !== roiRank) {
      const roiPlayers = await prisma.player.findMany({
        where: {
          id: {
            in: [roiRank, previousConfig.activeRoiId].filter(Boolean) as string[],
          },
        },
        select: {
          id: true,
          pseudo: true,
          email: true,
        },
      });

      const nextRoi = roiPlayers.find((player) => player.id === roiRank) ?? null;
      const previousRoi = previousConfig.activeRoiId
        ? roiPlayers.find((player) => player.id === previousConfig.activeRoiId) ?? null
        : null;

      if (nextRoi) {
        const stamp = new Date().toISOString();
        void (previousRoi
          ? sendRoiReplacementEmails({
              dethroned: previousRoi,
              nextRoi,
              dethronedEventKey: `roi-dethroned:final:${previousRoi.id}:${nextRoi.id}:${stamp}`,
              announcementEventKey: `roi-replaced:final:${previousRoi.id}:${nextRoi.id}:${stamp}`,
            })
          : sendRoiApprovedEmail({
              eventKey: `roi-approved:final:${nextRoi.id}:${stamp}`,
              roi: nextRoi,
            })
        ).catch((error) => {
          console.error("[admin-tournament] final ROI email failed", error);
        });
      }
    }

    await revalidateTournamentPages();
  }

  const config = await getTournamentConfig();
  const players = await prisma.player.findMany({
    where: { role: "PLAYER" },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      createdAt: true,
      pseudo: true,
      freefireId: true,
      gameMode: true,
      credits: true,
      isSeededTop10: true,
      seededTop20At: true,
      finalRank: true,
    },
  });

  const pools = splitTournamentPools(players, config.registrationLimit);
  const lockedPlayers = pools.top20Pool.length ? pools.top20Pool : players;
  const lockedPlayerIds = new Set(lockedPlayers.map((player) => player.id));
  const laterPlayers = pools.laterPlayers.filter((player) => !lockedPlayerIds.has(player.id));
  const top10Count = lockedPlayers.filter((player) => player.isSeededTop10).length;
  const requiredTop10Count = Math.min(10, lockedPlayers.length);
  const top20Capacity = players.length ? Math.min(config.registrationLimit, players.length) : config.registrationLimit;
  const stageLabels: Record<TournamentStage, string> = {
    REGISTRATION: "Inscriptions ouvertes",
    LOCKED: "Top 20 verrouille",
    ACTIVE: "Tournoi actif",
    FINALIZED: "Classement final valide",
  };

  return (
    <section className="space-y-4">
      {!compact ? (
        <div className="mb-2">
          <h2 className="text-2xl font-extrabold text-slate-950">Gestion avancée du tournoi</h2>
          <p className="mt-2 text-sm text-slate-500">Pilotage du top 20, du ROI, du top prioritaire et du classement final.</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[28px] border border-slate-950 bg-[#050505] p-5 shadow-sm">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Phase</div>
          <div className="mt-2 text-lg font-bold text-white">{stageLabels[config.stage]}</div>
        </div>
        <div className="rounded-[28px] border border-slate-950 bg-[#050505] p-5 shadow-sm">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Top 20 retenu</div>
          <div className="mt-2 text-lg font-bold text-white">{lockedPlayers.length} / {top20Capacity}</div>
        </div>
        <div className="rounded-[28px] border border-slate-950 bg-[#050505] p-5 shadow-sm">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Top prioritaire</div>
          <div className="mt-2 text-lg font-bold text-white">{top10Count} / {requiredTop10Count}</div>
        </div>
        <div className="rounded-[28px] border border-slate-950 bg-[#050505] p-5 shadow-sm">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-400">ROI actif</div>
          <div className="mt-2 text-lg font-bold text-white">
            {lockedPlayers.find((player) => player.id === config.activeRoiId)?.pseudo ?? "Non choisi"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <form action={setRoiAction} className="rounded-[28px] border border-slate-950 bg-[#050505] p-6 shadow-sm">
            <div className="text-lg font-bold text-white">Choisir le ROI</div>
            <p className="mt-2 text-sm text-white/60">
              Tant que ce choix n&apos;est pas fait, personne n&apos;apparait dans le classement public.
            </p>
            <select name="activeRoiId" defaultValue={config.activeRoiId ?? ""} className="mt-5 w-full rounded-2xl border border-white/10 bg-[#101010] px-4 py-3 text-sm font-medium text-white outline-none">
              <option value="">Selectionner un joueur du top 20</option>
              {lockedPlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.pseudo} • {player.gameMode} • {player.freefireId}
                </option>
              ))}
            </select>
            <div className="mt-5 flex justify-end">
              <button className="tp-button-primary" type="submit">
                Lancer le tournoi
              </button>
            </div>
          </form>

          <form action={setTop10Action} className="rounded-[28px] border border-slate-950 bg-[#050505] p-6 shadow-sm">
            <div className="text-lg font-bold text-white">Selectionner le top prioritaire</div>
            <p className="mt-2 text-sm text-white/60">
              Choisis les {requiredTop10Count} joueurs prioritaires du top 20 actuel. Le ROI doit faire partie de cette liste.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {lockedPlayers.map((player) => (
                <label key={player.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#101010] px-4 py-3 text-sm text-white/88">
                  <input type="checkbox" name="top10" value={player.id} defaultChecked={player.isSeededTop10} className="h-4 w-4 accent-orange-400" />
                  <span>
                    {player.pseudo} • {player.gameMode}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button className="tp-button-primary" type="submit">
                Sauver le top 10
              </button>
            </div>
          </form>

          <form action={finalizeTop20Action} className="rounded-[28px] border border-slate-950 bg-[#050505] p-6 shadow-sm">
            <div className="text-lg font-bold text-white">Finaliser le top 20</div>
            <p className="mt-2 text-sm text-white/60">
              Attribue à chacun un rang final unique de 1 à {lockedPlayers.length}. Les inscrits après la clôture seront automatiquement classés à partir du rang suivant.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {lockedPlayers.map((player) => (
                <label key={player.id} className="rounded-2xl border border-white/10 bg-[#101010] px-4 py-3 text-sm text-white/88">
                  <span className="block font-semibold text-white">{player.pseudo}</span>
                  <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-slate-400">
                    {player.gameMode} • {player.freefireId}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={lockedPlayers.length}
                    name={`rank-${player.id}`}
                    defaultValue={player.finalRank ?? ""}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-medium text-white outline-none"
                    required
                  />
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button className="tp-button-primary" type="submit">
                Valider le top 20 final
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-950 bg-[#050505] p-6 shadow-sm">
            <div className="text-lg font-bold text-white">Joueurs hors top 20</div>
            <p className="mt-2 text-sm text-white/60">
              Ces joueurs seront classés automatiquement à partir du rang suivant, selon l&apos;ordre d&apos;inscription.
            </p>
            <div className="mt-4 space-y-2">
              {laterPlayers.length ? (
                laterPlayers.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#101010] px-4 py-3 text-sm text-white/72">
                    <span>{player.pseudo}</span>
                    <span>Rang provisoire #{lockedPlayers.length + index + 1}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-[#101010] px-4 py-4 text-sm text-white/58">
                  {players.length < config.registrationLimit
                    ? "Aucun joueur n'est hors top 20 pour l'instant. Les inscrits actuels composent encore le top 20 provisoire."
                    : "Aucun inscrit apres la cloture du top 20."}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <form action={recalcAction} className="rounded-[28px] border border-slate-950 bg-[#050505] p-6 shadow-sm">
              <div className="text-lg font-bold text-white">Recalculer</div>
              <p className="mt-2 text-sm text-white/60">Met à jour statuts, éliminations et ROI selon la phase active.</p>
              <div className="mt-5 flex justify-end">
                <button className="tp-button-primary" type="submit">
                  Recalculer
                </button>
              </div>
            </form>

            <form action={resetAction} className="rounded-[28px] border border-slate-950 bg-[#050505] p-6 shadow-sm">
              <div className="text-lg font-bold text-white">Reset tournoi</div>
              <p className="mt-2 text-sm text-white/60">Réinitialise les marqueurs top 20, le ROI, les matchs et les défis.</p>
              <div className="mt-5 flex justify-end">
                <button className="tp-button-ghost" type="submit">
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}