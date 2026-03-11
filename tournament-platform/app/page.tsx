import Image from "next/image";
import Link from "next/link";
import { Gift, ShieldCheck, Trophy } from "lucide-react";

import { prisma } from "@/lib/prisma";

export async function generateMetadata() {
  return {
    title: "Accueil — Tournoi 1v1",
  };
}

export default async function Home() {
  const hasDb = Boolean(process.env.DATABASE_URL);

  const [players, matches] = hasDb
    ? await Promise.all([
        prisma.player.findMany({
          where: { role: "PLAYER" },
          orderBy: [{ credits: "desc" }, { wins: "desc" }, { createdAt: "asc" }],
          take: 3,
          select: { id: true, pseudo: true, freefireId: true, credits: true, logoUrl: true },
        }),
        prisma.match.findMany({
          where: { status: { in: ["LIVE", "PENDING"] } },
          orderBy: [{ status: "asc" }, { date: "asc" }],
          take: 2,
          include: {
            player1: { select: { pseudo: true, freefireId: true, logoUrl: true } },
            player2: { select: { pseudo: true, freefireId: true, logoUrl: true } },
          },
        }),
      ])
    : [[], []];

  const infoCards = [
    {
      title: "INSCRIPTIONS",
      icon: "📄",
      lines: [
        "Les 20 premiers inscrits forment le top 20 initial du tournoi.",
        "Pour participer, chaque joueur doit fournir :",
        "Son pseudo Free Fire",
        "Son logo officiel",
        "Son ID du jeu",
        "Après la clôture du top 20, les nouveaux inscrits continuent et seront classés à partir du rang 21.",
      ],
    },
    {
      title: "RÈGLES DU TOURNOI",
      icon: "⚔️",
      lines: [
        "Les joueurs s&apos;affrontent en 1v1 — Spam / One Tap.",
        "Règle du combat :",
        "Le gagnant récupère 1 crédit",
        "Le perdant perd 1 crédit",
        "Si un joueur descend en dessous de 5 crédits, il est éliminé du tournoi.",
      ],
    },
    {
      title: "LE ROI",
      icon: "👑",
      lines: [
        "Chaque joueur qui atteint la première place",
        "Le ROI reste en tête tant qu&apos;il gagne.",
        "Les autres joueurs peuvent le défier",
        "Les combats continuent à partir des matchs programmés",
        "Si le ROI perd, le vainqueur devient le nouveau ROI.",
      ],
    },
  ];

  return (
    <main className="relative overflow-hidden pb-10">
      <div className="pointer-events-none absolute inset-0 opacity-80 [background:radial-gradient(1000px_circle_at_50%_26%,rgba(255,139,59,0.12),transparent_35%),radial-gradient(900px_circle_at_50%_18%,rgba(186,85,211,0.20),transparent_36%),linear-gradient(to_bottom,transparent,rgba(11,16,38,0.16))]" />

      <section className="relative mx-auto max-w-[1200px] px-4 pt-5 sm:pt-8">
        <div className="mx-auto max-w-[760px] py-4 text-center md:py-10">
          <div className="-mt-[16px] flex justify-center sm:-mt-[40px] md:-mt-[60px]">
            <Image
              src="/lp2-removebg-preview.png"
              alt="Tournoi 1v1 Spam / One Tap"
              width={485}
              height={166}
              priority
              className="h-auto w-full max-w-[485px] object-contain drop-shadow-[0_0_30px_rgba(255,176,104,0.18)]"
            />
          </div>

          <div className="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/inscription" className="tp-home-cta tp-home-cta-primary">
              S&apos;inscrire
            </Link>
            <Link href="/login" className="tp-home-cta tp-home-cta-secondary">
              Connexion
            </Link>
          </div>
        </div>
      </section>

      <section className="relative mx-auto mt-4 max-w-[1200px] px-4 sm:mt-5">
        <div className="grid gap-4 md:grid-cols-3">
          {infoCards.map((card) => (
            <article key={card.title} className="tp-home-card group rounded-[18px] border border-violet-300/20 p-5 transition-all duration-300 hover:scale-[1.02] hover:border-amber-300/40">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-[1.02rem] font-black uppercase tracking-wide text-white/95">
                <span className="text-lg text-amber-300">{card.icon}</span>
                <span>{card.title}</span>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-white/78">
                {card.lines.map((line) => (
                  <li key={line} className="flex gap-2 leading-snug">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(255,183,77,0.9)]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto mt-5 max-w-[1200px] px-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <article className="tp-home-panel tp-reference-panel rounded-[16px] border border-violet-300/22 p-3">
            <div className="tp-reference-header">
              <span className="tp-reference-title-icon">🏠</span>
              <span>ÉTAPES DU TOURNOI</span>
            </div>

            <div className="mt-2 grid gap-3 md:grid-cols-[1fr_168px]">
              <div className="overflow-hidden rounded-[14px] border border-white/8 bg-[rgba(6,7,18,0.14)]">
                {players.length ? (
                  players.map((player, index) => (
                    <div key={player.id} className="tp-reference-row grid grid-cols-[42px_42px_minmax(0,1fr)] gap-2 px-3 py-3 sm:grid-cols-[54px_48px_1fr_92px] sm:items-center sm:py-2.5">
                      <div className="text-[1.55rem] font-black leading-none text-amber-300 drop-shadow-[0_0_10px_rgba(255,180,80,0.5)]">#{index + 1}</div>
                      <Image
                        src={player.logoUrl}
                        alt={player.pseudo}
                        width={42}
                        height={42}
                        className="h-10 w-10 rounded-full border border-violet-300/35 object-cover shadow-[0_0_14px_rgba(157,101,255,0.18)]"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate text-[1.05rem] font-semibold text-white md:text-[1.15rem]">
                          <span className="text-[0.9rem]">🛡️</span>
                          <span className="truncate">{player.pseudo}</span>
                        </div>
                        <div className="mt-0.5 truncate text-[11px] tracking-wide text-white/60">🎮 {player.freefireId}</div>
                      </div>
                      <div className="col-span-3 text-left sm:col-span-1 sm:text-right">
                        <div className="text-[1.05rem] font-black leading-none text-amber-100 md:text-[1.15rem]">{player.credits} <span className="font-medium text-white/80">crédits</span></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-white/60">
                    Le top joueurs apparaîtra ici dès que des comptes et des points réels seront disponibles.
                  </div>
                )}
              </div>

              <div className="tp-reference-king relative overflow-hidden rounded-[14px] border border-violet-300/18">
                <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_55%_18%,rgba(255,184,84,0.18),transparent_22%),radial-gradient(circle_at_48%_50%,rgba(140,78,255,0.20),transparent_36%),linear-gradient(180deg,rgba(42,20,64,0.28),rgba(7,8,18,0.08))]" />
                <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-4xl drop-shadow-[0_0_18px_rgba(255,192,82,0.6)]">👑</div>
                <div className="pointer-events-none absolute left-1/2 top-11 h-28 w-28 -translate-x-1/2 rounded-full bg-amber-400/12 blur-2xl" />
                <div className="pointer-events-none absolute left-1/2 top-12 h-24 w-24 -translate-x-1/2 rounded-full border border-violet-300/15 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.08),rgba(0,0,0,0.0)_55%)]" />
                <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 text-6xl opacity-90">💀</div>
                <div className="absolute inset-x-3 bottom-3">
                  <Link href="/classement" className="tp-reference-cta inline-flex w-full items-center justify-center">
                    VOIR LE CLASSEMENT
                  </Link>
                </div>
              </div>
            </div>
          </article>

          <article className="tp-home-panel tp-reference-panel rounded-[16px] border border-violet-300/22 p-3">
            <div className="tp-reference-header">
              <span className="tp-reference-title-icon">⚔️</span>
              <span>MATCHS</span>
            </div>

            <div className="mt-2 overflow-hidden rounded-[14px] border border-white/8 bg-[rgba(6,7,18,0.14)]">
              {matches.length ? (
                matches.map((match) => (
                  <div key={match.id} className="tp-reference-match-row grid gap-3 px-3 py-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Image src={match.player1.logoUrl} alt={match.player1.pseudo} width={40} height={40} className="h-10 w-10 rounded-full border border-violet-300/35 object-cover shadow-[0_0_14px_rgba(157,101,255,0.18)]" />
                      <div className="min-w-0">
                        <div className="truncate text-[1.05rem] font-semibold text-white">{match.player1.pseudo}</div>
                        <div className="truncate text-[11px] tracking-wide text-white/60">🎮 {match.player1.freefireId}</div>
                      </div>
                    </div>

                    <div className="tp-reference-vs">VS</div>

                    <div className="flex min-w-0 items-center gap-2.5 text-left sm:justify-self-end sm:text-right">
                      <div className="min-w-0">
                        <div className="truncate text-[1.05rem] font-semibold text-white">{match.player2.pseudo}</div>
                        <div className="truncate text-[11px] tracking-wide text-white/60">🎮 {match.player2.freefireId}</div>
                      </div>
                      <Image src={match.player2.logoUrl} alt={match.player2.pseudo} width={40} height={40} className="h-10 w-10 rounded-full border border-violet-300/35 object-cover shadow-[0_0_14px_rgba(157,101,255,0.18)]" />
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">Statut</div>
                      <div className="mt-0.5 text-[1.05rem] font-black text-white">{match.status === "LIVE" ? "Live" : "Programmé"}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-white/60">
                  Les prochains matchs apparaîtront ici dès qu&apos;ils seront créés par le système ou l&apos;admin.
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 px-1 pt-3 text-sm text-white/72">
              <div className="flex items-center gap-2">
                <span className="text-white/70">›</span>
                <span>Pour voir les matchs à venir</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-[6px] border border-white/10 bg-black/18 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/72">1v1</span>
                <span className="rounded-[6px] border border-white/10 bg-black/18 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/72">Menu</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <footer className="relative mx-auto mt-7 max-w-[1200px] px-4 pb-6">
        <div className="tp-home-footer tp-footer-bar rounded-[12px] border border-violet-300/20 px-4 py-4 sm:px-6 sm:py-3">
          <div className="grid gap-4 text-center text-sm font-bold uppercase tracking-[0.12em] text-white/82 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start sm:gap-5">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-amber-300" />
                <span>Loot</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-300" />
                <span>Fairplay</span>
              </div>
            </div>
            <div className="text-center text-[1.2rem] font-black tracking-[0.16em] text-white sm:text-[1.65rem]">FREE FIRE</div>
            <div className="flex items-center justify-center gap-2 sm:justify-end">
              <Trophy className="h-4 w-4 text-amber-300" />
              <span>Victory</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
