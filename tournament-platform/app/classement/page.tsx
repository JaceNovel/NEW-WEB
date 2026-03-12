import type { Metadata } from "next";
import Image from "next/image";
import { getServerSession } from "next-auth";

import RankingTable from "@/components/RankingTable";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTournamentConfig, getTournamentRanking, recalculateTournamentState } from "@/lib/tournament";
import { safeJson } from "@/lib/utils";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata({
  title: "Classement Free Fire",
  description: "Consulte le classement officiel KING League, la course au ROI et les positions qui evoluent au rythme des victoires et des credits.",
  path: "/classement",
  keywords: ["classement KING League", "ROI Free Fire", "classement competitif Free Fire"],
});

type ClassementPageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ClassementPage({ searchParams }: ClassementPageProps) {
  const session = await getServerSession(authOptions);
  const params = searchParams ? await searchParams : undefined;
  const requestedMode = params?.mode === "ONETAP" ? "ONETAP" : params?.mode === "SPAM" ? "SPAM" : null;
  const activeMode = requestedMode ?? ((session?.user as any)?.gameMode === "ONETAP" ? "ONETAP" : "SPAM");

  const hasDb = !!process.env.DATABASE_URL;
  const config = hasDb ? await getTournamentConfig() : null;
  const players = hasDb
    ? await (async () => {
        await recalculateTournamentState();
        return getTournamentRanking({ gameMode: activeMode === "ONETAP" ? "ONETAP" : "SPAM" });
      })()
    : [];

  const stageMessage = hasDb
    ? config?.stage === "REGISTRATION"
      ? "Les inscriptions sont ouvertes. Le classement sera affiché quand les 20 premiers joueurs seront verrouillés puis validés par l'admin."
      : config?.stage === "LOCKED"
        ? "Les 20 premiers joueurs sont verrouillés. Le classement apparaîtra dès que l'admin choisira le ROI et lancera le tournoi."
        : config?.stage === "FINALIZED"
          ? "Classement final validé par l'admin. Les joueurs inscrits après la clôture du top 20 suivent à partir du rang 21 selon leur ordre d'inscription."
          : null
    : null;

  return (
    <main className="relative overflow-hidden pb-12">
      <section className="mx-auto max-w-[1200px] px-4 pt-8">
        <div className="pointer-events-none absolute inset-x-0 top-18 h-[420px] opacity-85 [background:radial-gradient(900px_circle_at_50%_20%,rgba(192,117,255,0.18),transparent_34%),radial-gradient(900px_circle_at_50%_40%,rgba(255,151,83,0.10),transparent_40%)]" />

        <div className="relative mx-auto max-w-[720px] pt-8 text-center">
          <div className="mx-auto h-[2px] w-20 rounded-full bg-gradient-to-r from-transparent via-violet-200 to-transparent shadow-[0_0_18px_rgba(198,144,255,0.5)]" />
          <div className="mx-auto -mt-2 text-5xl text-violet-200 drop-shadow-[0_0_18px_rgba(185,130,255,0.5)]">△</div>
          <h1 className="tp-ranking-title mt-1 text-4xl font-black uppercase md:text-6xl">Classement</h1>
          <div className="mt-5 inline-flex rounded-full border border-white/10 bg-black/25 p-1 backdrop-blur-md">
            <a href="/classement?mode=SPAM" className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] transition ${activeMode === "SPAM" ? "bg-orange-400/15 text-white shadow-[0_0_18px_rgba(255,153,86,0.14)]" : "text-white/55"}`}>
              Spam
            </a>
            <a href="/classement?mode=ONETAP" className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] transition ${activeMode === "ONETAP" ? "bg-cyan-400/15 text-white shadow-[0_0_18px_rgba(103,232,249,0.14)]" : "text-white/55"}`}>
              One Tap
            </a>
          </div>
        </div>

        <div className="relative mt-16">
          {stageMessage ? (
            <div className="mb-6 rounded-[22px] border border-orange-300/18 bg-black/25 px-5 py-4 text-sm text-white/78 backdrop-blur-md">
              {stageMessage}
            </div>
          ) : null}

          {players.length ? (
            <RankingTable players={safeJson(players)} currentUserId={session?.user?.id ?? null} />
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/25 px-6 py-10 text-center backdrop-blur-md">
              <p className="text-xl font-black uppercase tracking-[0.22em] text-white">Classement en attente</p>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-white/60">
                Personne n&apos;est visible dans le classement tant que l&apos;admin n&apos;a pas officiellement lancé la phase de tournoi en choisissant le ROI.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
