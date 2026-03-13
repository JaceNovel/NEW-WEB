import { ChallengeStatus, GameMode, PlayerStatus, Role, TournamentStage, type Prisma } from "@prisma/client";
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

let lastTournamentRecalcAtMs = 0;

function compareCreditsThenDate(
  a: { points: number; wins: number; credits: number; createdAt: Date },
  b: { points: number; wins: number; credits: number; createdAt: Date },
) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.wins !== a.wins) return b.wins - a.wins;
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
  if (!tx) {
    const now = Date.now();
    if (now - lastTournamentRecalcAtMs < 15_000) return;
    lastTournamentRecalcAtMs = now;
  }

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
    const shouldEliminate = config.stage === TournamentStage.ACTIVE || config.stage === TournamentStage.FINALIZED;
    const eliminatedIds = shouldEliminate ? modePlayers.filter((p) => p.credits < 5).map((p) => p.id) : [];
    const alive = shouldEliminate ? modePlayers.filter((p) => p.credits >= 5) : modePlayers;
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
  points: number;
  status: PlayerStatus;
  wins: number;
  losses: number;
  createdAt: Date;
  isSeededTop10: boolean;
  seededTop20At: Date | null;
  finalRank: number | null;
  purchasedById: string | null;
  alliancePending: boolean;
  recruitedPlayers: Array<{ id: string; pseudo: string; logoUrl: string; freefireId: string }>;
  recruitedPlayersCount: number;
};

type TournamentPoolPlayer = {
  id: string;
  createdAt: Date;
  seededTop20At: Date | null;
};

export function splitTournamentPools<T extends TournamentPoolPlayer>(players: T[], registrationLimit: number) {
  const orderedByCreatedAt = [...players].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const explicitTop20 = orderedByCreatedAt.filter((player) => Boolean(player.seededTop20At));

  if (explicitTop20.length > 0) {
    const explicitIds = new Set(explicitTop20.map((player) => player.id));

    return {
      top20Pool: explicitTop20,
      laterPlayers: orderedByCreatedAt.filter((player) => !explicitIds.has(player.id)),
    };
  }

  return {
    top20Pool: orderedByCreatedAt.slice(0, registrationLimit),
    laterPlayers: orderedByCreatedAt.slice(registrationLimit),
  };
}

function withPositions(players: RankingPlayer[]) {
  return players.map((player, index) => ({
    ...player,
    rankingPosition: player.finalRank ?? index + 1,
  }));
}

export function orderTournamentRanking(config: { stage: TournamentStage; activeRoiId: string | null; registrationLimit: number }, players: RankingPlayer[]) {
  if (config.stage === TournamentStage.REGISTRATION || config.stage === TournamentStage.LOCKED || !config.activeRoiId && config.stage !== TournamentStage.FINALIZED) {
    return [] as Array<RankingPlayer & { rankingPosition: number }>;
  }

  const { top20Pool, laterPlayers } = splitTournamentPools(players, config.registrationLimit);

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
    where: {
      role: Role.PLAYER,
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      pseudo: true,
      freefireId: true,
      gameMode: true,
      logoUrl: true,
      credits: true,
      points: true,
      status: true,
      wins: true,
      losses: true,
      createdAt: true,
      isSeededTop10: true,
      seededTop20At: true,
      finalRank: true,
      purchasedById: true,
      alliancePending: true,
      _count: {
        select: {
          recruitedPlayers: true,
        },
      },
      recruitedPlayers: {
        where: { alliancePending: false },
        select: {
          id: true,
          pseudo: true,
          logoUrl: true,
          freefireId: true,
        },
      },
    },
  });

  const normalizedPlayers: RankingPlayer[] = players.map(({ _count, ...player }) => ({
    ...player,
    recruitedPlayersCount: _count.recruitedPlayers,
  }));

  const ordered = orderTournamentRanking(config, normalizedPlayers);
  return params?.gameMode ? ordered.filter((player) => player.gameMode === params.gameMode) : ordered;
}
