import { TournamentStage } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTournamentConfig, recalculateTournamentState } from "@/lib/tournament";

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

    await prisma.$transaction(async (tx) => {
      await tx.tournamentConfig.upsert({
        where: { id: "main" },
        update: {
          stage: TournamentStage.ACTIVE,
          activeRoiId,
          startedAt: new Date(),
        },
        create: {
          id: "main",
          stage: TournamentStage.ACTIVE,
          activeRoiId,
          startedAt: new Date(),
        },
      });
      await tx.player.update({
        where: { id: activeRoiId },
        data: { isSeededTop10: true },
      });
      await recalculateTournamentState(tx);
    });

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

    if (!config.activeRoiId || !selectedIds.includes(config.activeRoiId) || selectedIds.length !== 10) {
      throw new Error("Le top 10 doit contenir exactement 10 joueurs et inclure le ROI.");
    }

    await prisma.$transaction(async (tx) => {
      const top20Players = await tx.player.findMany({
        where: { seededTop20At: { not: null } },
        select: { id: true },
      });

      await tx.player.updateMany({
        where: { id: { in: top20Players.map((player) => player.id) } },
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

    const entries = Array.from(formData.entries()).filter(([key]) => key.startsWith("rank-"));
    const rankAssignments = entries
      .map(([key, value]) => ({
        playerId: key.replace("rank-", ""),
        rank: Number.parseInt(String(value), 10),
      }))
      .filter((entry) => Number.isFinite(entry.rank));

    const rankSet = new Set(rankAssignments.map((entry) => entry.rank));
    if (rankAssignments.length !== 20 || rankSet.size !== 20 || [...rankSet].some((rank) => rank < 1 || rank > 20)) {
      throw new Error("Attribue un rang unique de 1 a 20 a chaque joueur du top 20.");
    }

    await prisma.$transaction(async (tx) => {
      for (const assignment of rankAssignments) {
        await tx.player.update({
          where: { id: assignment.playerId },
          data: { finalRank: assignment.rank },
        });
      }

      const roiRank = rankAssignments.find((entry) => entry.rank === 1)?.playerId ?? null;
      await tx.tournamentConfig.upsert({
        where: { id: "main" },
        update: {
          stage: TournamentStage.FINALIZED,
          finalizedAt: new Date(),
          activeRoiId: roiRank,
        },
        create: {
          id: "main",
          stage: TournamentStage.FINALIZED,
          finalizedAt: new Date(),
          activeRoiId: roiRank,
        },
      });
      await recalculateTournamentState(tx);
    });

    await revalidateTournamentPages();
  }

  const config = await getTournamentConfig();
  const players = await prisma.player.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      pseudo: true,
      freefireId: true,
      gameMode: true,
      credits: true,
      isSeededTop10: true,
      seededTop20At: true,
      finalRank: true,
    },
  });

  const lockedPlayers = players.filter((player) => player.seededTop20At);
  const laterPlayers = players.filter((player) => !player.seededTop20At);
  const top10Count = lockedPlayers.filter((player) => player.isSeededTop10).length;
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
          <h2 className="text-2xl font-extrabold text-white">Gestion avancée du tournoi</h2>
          <p className="mt-2 text-sm text-white/60">Pilotage du top 20, du ROI, du top 10 et du classement final.</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="tp-glass rounded-3xl p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-white/45">Phase</div>
          <div className="mt-2 text-lg font-bold text-white">{stageLabels[config.stage]}</div>
        </div>
        <div className="tp-glass rounded-3xl p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-white/45">Top 20</div>
          <div className="mt-2 text-lg font-bold text-white">{lockedPlayers.length} / {config.registrationLimit}</div>
        </div>
        <div className="tp-glass rounded-3xl p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-white/45">Top 10</div>
          <div className="mt-2 text-lg font-bold text-white">{top10Count} / 10</div>
        </div>
        <div className="tp-glass rounded-3xl p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-white/45">ROI actif</div>
          <div className="mt-2 text-lg font-bold text-white">
            {lockedPlayers.find((player) => player.id === config.activeRoiId)?.pseudo ?? "Non choisi"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <form action={setRoiAction} className="tp-glass rounded-3xl p-6">
            <div className="text-lg font-bold text-white">Choisir le ROI</div>
            <p className="mt-2 text-sm text-white/60">
              Tant que ce choix n&apos;est pas fait, personne n&apos;apparait dans le classement public.
            </p>
            <select name="activeRoiId" defaultValue={config.activeRoiId ?? ""} className="tp-input mt-5">
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

          <form action={setTop10Action} className="tp-glass rounded-3xl p-6">
            <div className="text-lg font-bold text-white">Selectionner le top 10</div>
            <p className="mt-2 text-sm text-white/60">
              Choisis les 10 joueurs prioritaires du top 20. Le ROI doit faire partie de cette liste.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {lockedPlayers.map((player) => (
                <label key={player.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
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

          <form action={finalizeTop20Action} className="tp-glass rounded-3xl p-6">
            <div className="text-lg font-bold text-white">Finaliser le top 20</div>
            <p className="mt-2 text-sm text-white/60">
              Attribue a chacun un rang final unique de 1 a 20. Les inscrits apres la cloture seront automatiquement classes a partir du rang 21.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {lockedPlayers.map((player) => (
                <label key={player.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
                  <span className="block font-semibold text-white">{player.pseudo}</span>
                  <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-white/45">
                    {player.gameMode} • {player.freefireId}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    name={`rank-${player.id}`}
                    defaultValue={player.finalRank ?? ""}
                    className="tp-input mt-3"
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
          <div className="tp-glass rounded-3xl p-6">
            <div className="text-lg font-bold text-white">Joueurs hors top 20</div>
            <p className="mt-2 text-sm text-white/60">
              Ces joueurs seront classes automatiquement a partir du rang 21, selon l&apos;ordre d&apos;inscription.
            </p>
            <div className="mt-4 space-y-2">
              {laterPlayers.length ? (
                laterPlayers.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
                    <span>{player.pseudo}</span>
                    <span>Rang provisoire #{lockedPlayers.length + index + 1}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/50">
                  Aucun inscrit apres la cloture du top 20.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <form action={recalcAction} className="tp-glass rounded-3xl p-6">
              <div className="text-lg font-bold text-white">Recalculer</div>
              <p className="mt-2 text-sm text-white/60">Met a jour statuts, eliminations et ROI selon la phase active.</p>
              <div className="mt-5 flex justify-end">
                <button className="tp-button-primary" type="submit">
                  Recalculer
                </button>
              </div>
            </form>

            <form action={resetAction} className="tp-glass rounded-3xl p-6">
              <div className="text-lg font-bold text-white">Reset tournoi</div>
              <p className="mt-2 text-sm text-white/60">Reinitialise les marqueurs top 20, le ROI, les matchs et les defis.</p>
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