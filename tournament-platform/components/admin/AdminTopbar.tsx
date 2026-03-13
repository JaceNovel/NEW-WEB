"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Coins, Command, History, Home, LayoutDashboard, Search, Settings2, Swords, Trophy } from "lucide-react";

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
    <header className="rounded-[28px] border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 rounded-[20px] bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <Image src="/pp1-removebg-preview (1).png" alt="Admin" width={36} height={36} className="h-9 w-9 object-contain" />
            </div>
            <div>
              <div className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-slate-400">Administration</div>
              <div className="text-lg font-black text-slate-950">{displayName}</div>
            </div>
          </div>

          <nav className="hidden items-center gap-2 rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-2 lg:flex">
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
                      ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:bg-white hover:text-slate-950"
                  )}
                >
                  <Icon className="h-4 w-4 text-orange-500" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="hidden min-w-[260px] items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 md:flex">
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              Rechercher un joueur, un match...
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
              <Command className="h-3 w-3" />
              K
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
              <Bell className="h-4 w-4" />
            </button>

            <div className="inline-flex items-center gap-2 rounded-[18px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800">
              <Coins className="h-4 w-4 text-emerald-600" />
              {credits}
            </div>

            <div className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
              <div className="text-right">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Session</div>
                <div className="text-sm font-bold text-slate-950">{displayName}</div>
              </div>
              <div className="relative h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                <Image src={avatarUrl} alt={displayName} fill sizes="44px" className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}