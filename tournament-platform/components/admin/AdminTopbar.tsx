"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, History, Home, LayoutDashboard, Search, Settings2, Swords, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";

type AdminTopbarProps = {
  displayName: string;
  credits: number;
  avatarUrl: string;
};

const topLinks = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/matchs", label: "Matchs", icon: Swords },
  { href: "/admin/classement", label: "Classement", icon: Trophy },
  { href: "/admin/credits", label: "Crédits", icon: Coins },
  { href: "/admin/historique", label: "Historique", icon: History },
  { href: "/admin", label: "Admin", icon: Settings2 },
];

export default function AdminTopbar({ displayName, credits, avatarUrl }: AdminTopbarProps) {
  const pathname = usePathname();

  return (
    <header className="relative overflow-hidden rounded-[30px] border border-fuchsia-300/15 bg-[linear-gradient(180deg,rgba(33,12,57,0.88),rgba(10,10,24,0.82))] px-4 py-3 shadow-[0_0_40px_rgba(171,82,255,0.10)] backdrop-blur-xl sm:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,163,80,0.12),transparent_22%),radial-gradient(circle_at_top,rgba(197,110,255,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_24%)]" />

      <div className="relative flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] px-3 py-2.5 shadow-[0_0_20px_rgba(255,153,79,0.08)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-fuchsia-300/20 bg-black/25 shadow-[0_0_22px_rgba(171,82,255,0.14)]">
              <Image src="/pp1-removebg-preview (1).png" alt="Admin" width={36} height={36} className="h-9 w-9 object-contain" />
            </div>
            <div>
              <div className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-fuchsia-200/75">Admin</div>
              <div className="text-lg font-black text-white">{displayName}</div>
            </div>
          </div>

          <nav className="hidden items-center gap-2 rounded-[20px] border border-white/10 bg-white/[0.04] px-3 py-2 lg:flex">
            {topLinks.map((item) => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black uppercase tracking-[0.12em] transition-all duration-200",
                    active
                      ? "border border-fuchsia-300/25 bg-[linear-gradient(90deg,rgba(123,61,255,0.30),rgba(255,135,77,0.12))] text-white shadow-[0_0_20px_rgba(187,95,255,0.16)]"
                      : "text-white/58 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 text-amber-300" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="hidden min-w-[220px] items-center gap-2 rounded-[18px] border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/55 shadow-[inset_0_0_16px_rgba(255,255,255,0.02)] md:flex">
            <Search className="h-4 w-4 text-fuchsia-200/70" />
            <span>Rechercher un joueur, un match...</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-[18px] border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm font-black text-amber-100 shadow-[0_0_18px_rgba(255,184,82,0.10)]">
              <Coins className="h-4 w-4 text-amber-300" />
              {credits}
            </div>

            <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.04] px-2.5 py-2 shadow-[0_0_20px_rgba(171,82,255,0.08)]">
              <div className="text-right">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Session</div>
                <div className="text-sm font-bold text-white">{displayName}</div>
              </div>
              <div className="relative h-11 w-11 overflow-hidden rounded-full border border-fuchsia-300/30 bg-black/20">
                <Image src={avatarUrl} alt={displayName} fill sizes="44px" className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}