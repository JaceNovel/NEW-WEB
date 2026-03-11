import { prisma } from "@/lib/prisma";

const DEFAULT_CREDIT_PRODUCTS = [
  {
    key: "BOOST_1",
    label: "1 credit",
    credits: 1,
    priceFcfa: 500,
    maxPurchasesPerPlayer: 3,
    description: "Recharge de secours pour rester actif pendant la phase de selection du ROI.",
  },
  {
    key: "BOOST_10",
    label: "10 credits",
    credits: 10,
    priceFcfa: 3000,
    maxPurchasesPerPlayer: null,
    description: "Pack standard pour renforcer ta progression dans PRIME League.",
  },
  {
    key: "BOOST_25",
    label: "25 credits",
    credits: 25,
    priceFcfa: 6500,
    maxPurchasesPerPlayer: null,
    description: "Pack elite pour consolider ton avance et ouvrir les achats de joueur.",
  },
] as const;

export type CreditPackKey = (typeof DEFAULT_CREDIT_PRODUCTS)[number]["key"];

export async function ensureCreditProducts() {
  const count = await prisma.creditProduct.count();
  if (count > 0) {
    return prisma.creditProduct.findMany({ orderBy: [{ credits: "asc" }, { createdAt: "asc" }] });
  }

  await prisma.creditProduct.createMany({
    data: [...DEFAULT_CREDIT_PRODUCTS],
    skipDuplicates: true,
  });

  return prisma.creditProduct.findMany({ orderBy: [{ credits: "asc" }, { createdAt: "asc" }] });
}

export async function getCreditPack(packKey: string) {
  await ensureCreditProducts();
  return prisma.creditProduct.findUnique({ where: { key: packKey } });
}

export function getRecruitmentCost(rank: number | null | undefined) {
  if (!rank) return 13;
  return rank <= 10 ? 18 : 13;
}

export function hasRecruitmentAccess(credits: number) {
  return credits >= 20;
}

export function getAllianceLabel(basePseudo: string, recruitedPseudo?: string | null) {
  return recruitedPseudo ? `${basePseudo} X ${recruitedPseudo}` : basePseudo;
}

export function formatFcfa(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}