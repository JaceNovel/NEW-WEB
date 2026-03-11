"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Coins, LogIn, LogOut, Shield } from "lucide-react";

export default function Navbar() {
  const { data } = useSession();
  const isAdmin = data?.user?.role === "ADMIN";
  const pathname = usePathname();
  const credits = data?.user?.credits ?? 0;

  const navItems: Array<{ href: string; label: string; isActive?: boolean }> = [
    { href: "/credits", label: "CREDIT" },
    { href: "/classement", label: "CLASSEMENT" },
    { href: "/matchs", label: "MATCHS" },
    { href: "/historique", label: "HISTORIQUE" },
  ];

  if (isAdmin) {
    navItems.push({ href: "/admin", label: "ADMIN" });
  }

  return (
    <header className="sticky top-0 z-40 pt-1">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="tp-nav-shell flex items-center justify-between gap-4 px-3 py-2.5">
          <Link href="/" className="hidden min-w-[120px] items-center lg:flex">
            <Image
              src="/pp1-removebg-preview (1).png"
              alt="Logo tournoi"
              width={92}
              height={92}
              priority
              className="h-14 w-auto object-contain opacity-95 drop-shadow-[0_0_18px_rgba(255,164,92,0.18)]"
            />
          </Link>

          <nav className="tp-nav-center hidden items-center md:flex">
            {navItems.map((item, idx) => {
              const active = item.isActive ?? pathname === item.href;

              return (
                <div key={item.href} className="flex items-center gap-3">
                  <Link className={`tp-nav-link ${active ? "tp-nav-link-active" : ""}`} href={item.href}>
                    {active ? <motion.span layoutId="nav-active" className="tp-nav-active-bg" transition={{ type: "spring", stiffness: 360, damping: 30 }} /> : null}
                    <span className="relative z-10 inline-flex items-center gap-2">
                      {item.label === "ADMIN" ? <Shield className="h-4 w-4" /> : null}
                      {item.label}
                    </span>
                  </Link>
                  {idx < navItems.length - 1 ? <span className="tp-nav-dot">•</span> : null}
                </div>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 min-w-fit md:ml-auto">
          {!data?.user?.id ? (
            <>
              <Link href="/inscription" className="tp-nav-action tp-nav-action-primary">
                S&apos;inscrire
              </Link>
              <button onClick={() => signIn()} className="tp-nav-action tp-nav-action-secondary">
                <LogIn className="mr-1 inline h-4 w-4" /> CONNEXION
              </button>
            </>
          ) : (
            <>
              <Link href="/profile" className="tp-nav-action tp-nav-action-primary inline-flex items-center gap-2">
                <img
                  src="https://img.icons8.com/?size=100&id=492ILERveW8G&format=png&color=000000"
                  alt="Profil"
                  width="22"
                  height="22"
                  className="h-[18px] w-[18px] object-contain brightness-[2.3] contrast-[1.15]"
                />
                <span>PROFIL</span>
              </Link>
              <div className="tp-nav-action tp-nav-action-secondary inline-flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-300" />
                <span>{credits}</span>
              </div>
              <button onClick={() => signOut()} className="tp-nav-action tp-nav-action-secondary">
                <LogOut className="mr-1 inline h-4 w-4" /> DÉCONNEXION
              </button>
            </>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
