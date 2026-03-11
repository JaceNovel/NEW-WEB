import bcrypt from "bcryptjs";
import { PrismaClient, GameMode, PlayerStatus, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pseudo = process.env.ADMIN_PSEUDO;
  const password = process.env.ADMIN_PASSWORD;

  if (!pseudo || !password) {
    throw new Error("Missing ADMIN_PSEUDO or ADMIN_PASSWORD env vars");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.player.findUnique({
    where: { pseudo },
    select: { id: true },
  });

  if (existing) {
    await prisma.player.update({
      where: { id: existing.id },
      data: {
        role: Role.ADMIN,
        passwordHash,
      },
    });
    return;
  }

  await prisma.player.create({
    data: {
      pseudo,
      freefireId: `admin-${pseudo}`.slice(0, 32),
      countryCode: "FR",
      gameMode: GameMode.ONETAP,
      logoUrl: "/lp2-removebg-preview.png",
      credits: 5,
      points: 0,
      status: PlayerStatus.PLAYER,
      role: Role.ADMIN,
      passwordHash,
      wins: 0,
      losses: 0,
      weeklyCreditsGrantedAt: new Date(),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
