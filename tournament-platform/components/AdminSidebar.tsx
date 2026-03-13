"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Coins, Crown, History, LayoutDashboard, Shield, Sparkles, Swords, Trophy, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/joueurs", label: "Joueurs", icon: Users },
  { href: "/admin/matchs", label: "Matchs", icon: Swords },
  { href: "/admin/classement", label: "Classement", icon: Trophy },
  { href: "/admin/credits", label: "Crédits", icon: Coins },
  { href: "/admin/historique", label: "Historique", icon: History },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 rounded-[26px] bg-[linear-gradient(135deg,#fff3ee,#fff8f1)] px-4 py-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <Image
            src="/pp1-removebg-preview (1).png"
            alt="Admin"
            width={48}
            height={48}
            className="h-11 w-11 object-contain"
          />
        </div>
        <div>
          <div className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.28em] text-rose-500">
            <Shield className="h-3.5 w-3.5 text-orange-500" />
            KING League Admin
          </div>
          <div className="mt-1 text-lg font-black text-slate-950">Centre de contrôle</div>
          <div className="text-xs text-slate-500">Gestion du tournoi et des joueurs</div>
        </div>
      </div>

      <div className="mt-6 text-[0.68rem] font-black uppercase tracking-[0.28em] text-slate-400">Navigation</div>

      <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 text-sm xl:block xl:space-y-2 xl:overflow-visible xl:pb-0">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex min-w-[220px] items-center justify-between rounded-[22px] border px-3.5 py-3 transition-all duration-200 xl:min-w-0",
                active
                  ? "border-transparent bg-[linear-gradient(90deg,#fff1ea,#fff7ef)] text-slate-950 shadow-sm ring-1 ring-orange-200"
                  : "border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors",
                    active
                      ? "border-orange-200 bg-white text-orange-600"
                      : "border-slate-200 bg-slate-50 text-slate-500 group-hover:text-orange-600"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span>
                  <span className="block font-bold">{item.label}</span>
                  <span className="block text-[0.68rem] uppercase tracking-[0.18em] text-slate-400">
                    {item.label === "Tableau de bord" ? "Vue globale" : "Section admin"}
                  </span>
                </span>
              </span>
              <ArrowRight className={cn("h-4 w-4 transition-transform", active ? "translate-x-0 text-slate-500" : "text-slate-300 group-hover:translate-x-0.5")} />
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-[28px] bg-slate-950 p-5 text-white">
        <div className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.26em] text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-orange-400" />
          Focus du jour
        </div>
        <div className="mt-3 text-lg font-black">Pilote les joueurs, matchs et crédits depuis un seul endroit.</div>
        <div className="mt-2 text-sm leading-6 text-slate-300">Le panneau garde la logique tournoi du projet, mais avec une lecture plus claire et plus proche d’un vrai back-office moderne.</div>
      </div>

      <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-xs text-slate-500">
        <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-slate-400">
          <Crown className="h-3.5 w-3.5 text-amber-500" />
          Admin sécurisé
        </div>
        <div className="mt-1 leading-5">Les actions sensibles restent réservées aux administrateurs authentifiés.</div>
      </div>
    </aside>
  );
}
