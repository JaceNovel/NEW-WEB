import { ChallengeStatus, GameMode, PlayerStatus, TournamentStage, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const tournamentConfigSelect = {
  id: true,
  registrationLimit: true,
  stage: true,
  activeRoiId: true,
  lockedAt: true,
  startedAt: true,
  finalizedAt: true,
} satisfies Prisma.TournamentConfigSelect;

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

function compareCreditsThenDate(
  a: { credits: number; createdAt: Date },
  b: { credits: number; createdAt: Date },
) {
  if (b.credits !== a.credits) return b.credits - a.credits;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

export async function ensureTournamentConfig(tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  const existing = await db.tournamentConfig.findUnique({
    where: { id: "main" },
    select: tournamentConfigSelect,
  });
  if (existing) return existing;

  return db.tournamentConfig.create({
    data: { id: "main" },
    select: tournamentConfigSelect,
  });
}

export async function syncTournamentRegistration(tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;
  const config = await ensureTournamentConfig(tx);

  const firstPlayers = await db.player.findMany({
    orderBy: [{ createdAt: "asc" }],
    take: config.registrationLimit,
    select: { id: true, seededTop20At: true },
  });

  const topIds = firstPlayers.map((player) => player.id);

  if (topIds.length >= config.registrationLimit) {
    const missingTop20Ids = firstPlayers.filter((player) => !player.seededTop20At).map((player) => player.id);
    const lockDate = config.lockedAt ?? new Date();

    if (missingTop20Ids.length) {
      await db.player.updateMany({
        where: { id: { in: missingTop20Ids } },
        data: { seededTop20At: lockDate },
      });
    }

    if (config.stage === TournamentStage.REGISTRATION) {
      return db.tournamentConfig.update({
        where: { id: config.id },
        data: {
          stage: TournamentStage.LOCKED,
          lockedAt: lockDate,
        },
        select: tournamentConfigSelect,
      });
    }
  }

  return config;
}

export async function recalculateTournamentState(tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;
  const config = await syncTournamentRegistration(tx);

  const players = await db.player.findMany({
    orderBy: [{ credits: "desc" }, { createdAt: "asc" }],
    select: { id: true, credits: true, gameMode: true },
  });

  const activeChallenges = await db.challenge.findMany({
    where: { status: { in: [ChallengeStatus.PENDING, ChallengeStatus.ACCEPTED] } },
    select: {
      challengerId: true,
      defenderId: true,
      challenger: { select: { gameMode: true } },
      defender: { select: { gameMode: true } },
    },
  });

  const activeRoiId =
    config.stage === TournamentStage.ACTIVE || config.stage === TournamentStage.FINALIZED
      ? config.activeRoiId
      : null;

  for (const gameMode of [GameMode.SPAM, GameMode.ONETAP]) {
    const modePlayers = players.filter((player) => player.gameMode === gameMode);
    const eliminatedIds = modePlayers.filter((p) => p.credits < 5).map((p) => p.id);
    const alive = modePlayers.filter((p) => p.credits >= 5);
    const defaultPlayerIds = alive.map((p) => p.id).filter((id) => id !== activeRoiId);

    if (eliminatedIds.length) {
      await db.player.updateMany({
        where: { id: { in: eliminatedIds } },
        data: { status: PlayerStatus.ELIMINATED },
      });
    }

    if (defaultPlayerIds.length) {
      await db.player.updateMany({
        where: { id: { in: defaultPlayerIds } },
        data: { status: PlayerStatus.PLAYER },
      });
    }

    if (activeRoiId && alive.some((player) => player.id === activeRoiId)) {
      await db.player.update({ where: { id: activeRoiId }, data: { status: PlayerStatus.ROI } });
    }

    const challengerIds = Array.from(
      new Set(
        activeChallenges
          .filter((challenge) => challenge.challenger.gameMode === gameMode && challenge.defender.gameMode === gameMode)
          .flatMap((challenge) => [challenge.challengerId, challenge.defenderId]),
      ),
    ).filter((id) => id !== activeRoiId && !eliminatedIds.includes(id));

    if (challengerIds.length) {
      await db.player.updateMany({
        where: { id: { in: challengerIds } },
        data: { status: PlayerStatus.CHALLENGER },
      });
    }
  }
}

export async function getTournamentConfig(tx?: Prisma.TransactionClient) {
  const config = await syncTournamentRegistration(tx);
  return config;
}

type RankingPlayer = {
  id: string;
  pseudo: string;
  freefireId: string;
  gameMode: GameMode;
  logoUrl: string;
  credits: number;
  status: PlayerStatus;
  wins: number;
  losses: number;
  createdAt: Date;
  isSeededTop10: boolean;
  seededTop20At: Date | null;
  finalRank: number | null;
};

function withPositions(players: RankingPlayer[]) {
  return players.map((player, index) => ({
    ...player,
    rankingPosition: player.finalRank ?? index + 1,
  }));
}

export function orderTournamentRanking(config: { stage: TournamentStage; activeRoiId: string | null }, players: RankingPlayer[]) {
  if (config.stage === TournamentStage.REGISTRATION || config.stage === TournamentStage.LOCKED || !config.activeRoiId && config.stage !== TournamentStage.FINALIZED) {
    return [] as Array<RankingPlayer & { rankingPosition: number }>;
  }

  const top20Pool = players.filter((player) => Boolean(player.seededTop20At));
  const laterPlayers = players.filter((player) => !player.seededTop20At).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  if (config.stage === TournamentStage.FINALIZED) {
    const finalizedTop20 = top20Pool
      .filter((player) => player.finalRank !== null)
      .sort((a, b) => (a.finalRank ?? 999) - (b.finalRank ?? 999));

    return [
      ...finalizedTop20.map((player) => ({ ...player, rankingPosition: player.finalRank ?? 0 })),
      ...laterPlayers.map((player, index) => ({ ...player, rankingPosition: finalizedTop20.length + index + 1 })),
    ];
  }

  const roi = top20Pool.find((player) => player.id === config.activeRoiId) ?? null;
  const seededTop10 = top20Pool
    .filter((player) => player.isSeededTop10 && player.id !== config.activeRoiId)
    .sort(compareCreditsThenDate);
  const remainingTop20 = top20Pool
    .filter((player) => player.id !== config.activeRoiId && !player.isSeededTop10)
    .sort(compareCreditsThenDate);

  const activeRanking = roi ? [roi, ...seededTop10, ...remainingTop20] : [...seededTop10, ...remainingTop20];

  return [
    ...withPositions(activeRanking),
    ...laterPlayers.map((player, index) => ({ ...player, rankingPosition: activeRanking.length + index + 1 })),
  ];
}

export async function getTournamentRanking(
  params?: {
    tx?: Prisma.TransactionClient;
    gameMode?: GameMode;
  },
) {
  const db: DatabaseClient = params?.tx ?? prisma;
  const config = await getTournamentConfig(params?.tx);
  const players = await db.player.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      pseudo: true,
      freefireId: true,
      gameMode: true,
      logoUrl: true,
      credits: true,
      status: true,
      wins: true,
      losses: true,
      createdAt: true,
      isSeededTop10: true,
      seededTop20At: true,
      finalRank: true,
    },
  });

  const ordered = orderTournamentRanking(config, players);
  return params?.gameMode ? ordered.filter((player) => player.gameMode === params.gameMode) : ordered;
}
