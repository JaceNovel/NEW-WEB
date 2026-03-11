import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { ensureCreditProducts } from "@/lib/economy";
import { apiError, applyRateLimit, requireAdmin } from "@/app/api/_utils";

const BodySchema = z.object({
  key: z.string().trim().min(2).max(32),
  label: z.string().trim().min(2).max(80),
  credits: z.number().int().min(1).max(999),
  priceFcfa: z.number().int().min(100).max(999999),
  maxPurchasesPerPlayer: z.number().int().min(1).max(20).nullable().optional(),
  description: z.string().trim().min(4).max(280),
});

export async function GET() {
  try {
    applyRateLimit("admin-credit-product-list");
    await requireAdmin();
    const products = await ensureCreditProducts();
    return NextResponse.json({ ok: true, products });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    applyRateLimit("admin-credit-product-create");
    await requireAdmin();
    const body = BodySchema.parse(await req.json());

    const created = await prisma.creditProduct.create({
      data: {
        key: body.key.toUpperCase().replace(/\s+/g, "_"),
        label: body.label,
        credits: body.credits,
        priceFcfa: body.priceFcfa,
        maxPurchasesPerPlayer: body.maxPurchasesPerPlayer ?? null,
        description: body.description,
      },
    });

    return NextResponse.json({ ok: true, product: created });
  } catch (error) {
    return apiError(error);
  }
}