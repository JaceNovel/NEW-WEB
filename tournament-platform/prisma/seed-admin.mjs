import bcrypt from "bcryptjs";

import fs from "node:fs";
import path from "node:path";

function applyEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

// Ensure DATABASE_URL exists for Prisma when running via `node ...`
const rootDir = process.cwd();
applyEnvFile(path.join(rootDir, ".env.local"));
applyEnvFile(path.join(rootDir, ".env"));

// Vercel Postgres fallbacks (local `vercel env pull` sometimes uses these names)
if (!process.env.DATABASE_URL) {
  const fallbackUrl = process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (fallbackUrl) process.env.DATABASE_URL = fallbackUrl;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. Add it to .env.local (see .env.example) or export DATABASE_URL before running npm run seed:admin.",
  );
}

const { PrismaClient, GameMode, PlayerStatus, Role } = await import("@prisma/client");
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
