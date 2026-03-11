"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Crown, History, LayoutDashboard, Shield, Swords, Trophy, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/joueurs", label: "Joueurs", icon: Users },
  { href: "/admin/matchs", label: "Matchs", icon: Swords },
  { href: "/admin/classement", label: "Classement", icon: Trophy },
  { href: "/admin/historique", label: "Historique", icon: History },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative overflow-hidden rounded-[30px] border border-fuchsia-400/15 bg-[linear-gradient(180deg,rgba(33,12,57,0.88),rgba(10,10,24,0.92))] p-4 shadow-[0_0_50px_rgba(171,82,255,0.12)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,163,80,0.18),transparent_20%),radial-gradient(circle_at_top_right,rgba(154,93,255,0.22),transparent_30%),radial-gradient(circle_at_50%_24%,rgba(255,255,255,0.06),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_24%)]" />

      <div className="relative flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/5 px-3 py-3.5 shadow-[inset_0_0_22px_rgba(255,255,255,0.02)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-300/20 bg-black/20 shadow-[0_0_24px_rgba(254,164,85,0.14)]">
          <Image
            src="/pp1-removebg-preview (1).png"
            alt="Admin"
            width={48}
            height={48}
            className="h-11 w-11 object-contain"
          />
        </div>
        <div>
          <div className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.28em] text-fuchsia-200/75">
            <Shield className="h-3.5 w-3.5 text-amber-300" />
            Admin Panel
          </div>
          <div className="mt-1 text-lg font-black text-white">BadBoyShop</div>
          <div className="text-xs text-white/45">Gestion tournoi et activité</div>
        </div>
      </div>

      <nav className="relative mt-5 space-y-2 text-sm">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-[22px] border px-3.5 py-3 transition-all duration-200",
                active
                  ? "border-fuchsia-300/34 bg-[linear-gradient(90deg,rgba(123,61,255,0.44),rgba(255,135,77,0.20))] text-white shadow-[0_0_26px_rgba(187,95,255,0.22)]"
                  : "border-white/8 bg-white/[0.03] text-white/70 hover:border-fuchsia-300/20 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors",
                    active
                      ? "border-fuchsia-300/25 bg-white/10 text-amber-300"
                      : "border-white/10 bg-black/10 text-white/60 group-hover:text-amber-200"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span>
                  <span className="block font-bold">{item.label}</span>
                  <span className="block text-[0.68rem] uppercase tracking-[0.18em] text-white/35">
                    {item.label === "Tableau de bord" ? "Vue globale" : "Section admin"}
                  </span>
                </span>
              </span>
              <ArrowRight className={cn("h-4 w-4 transition-transform", active ? "translate-x-0 text-white/80" : "text-white/25 group-hover:translate-x-0.5")} />
            </Link>
          );
        })}
      </nav>

      <div className="relative mt-6 rounded-[24px] border border-amber-300/15 bg-[linear-gradient(180deg,rgba(255,174,83,0.12),rgba(138,57,255,0.08))] p-4">
        <div className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.26em] text-amber-200/70">
          <Crown className="h-3.5 w-3.5" />
          Accès sécurisé
        </div>
        <div className="mt-2 text-sm font-semibold text-white">Interface réservée aux administrateurs.</div>
        <div className="mt-1 text-xs leading-5 text-white/45">Toutes les actions sensibles du tournoi passent par ce panneau de contrôle.</div>
      </div>

      <div className="relative mt-4 rounded-[24px] border border-white/8 bg-black/20 px-4 py-3.5 text-xs text-white/40">
        <div className="font-black uppercase tracking-[0.2em] text-white/30">Powered by Gestionnaire</div>
        <div className="mt-1 leading-5">Dashboard adapté au thème cosmique du site et connecté aux données réelles.</div>
      </div>
    </aside>
  );
}
