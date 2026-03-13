"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Coins, History, LogIn, LogOut, Shield, Swords, Trophy } from "lucide-react";

export default function Navbar() {
  const { data, status, update } = useSession();
  const isAuthenticated = Boolean(data?.user?.id) || status === "authenticated";
  const isAdmin = data?.user?.role === "ADMIN";
  const pathname = usePathname();
  const credits = data?.user?.credits ?? 0;
  const updateRef = useRef(update);
  const lastSessionRefreshRef = useRef(0);

  useEffect(() => {
    updateRef.current = update;
  }, [update]);

  useEffect(() => {
    const now = Date.now();

    if (now - lastSessionRefreshRef.current < 30_000) {
      return;
    }

    lastSessionRefreshRef.current = now;
    void updateRef.current();
  }, [pathname]);

  useEffect(() => {
    function refreshSession() {
      const now = Date.now();

      if (now - lastSessionRefreshRef.current < 30_000) {
        return;
      }

      lastSessionRefreshRef.current = now;
      void updateRef.current();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshSession();
      }
    }

    window.addEventListener("focus", refreshSession);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const navItems: Array<{ href: string; label: string; isActive?: boolean; icon: typeof Coins }> = [
    { href: "/credits", label: "CRÉDITS", icon: Coins },
    { href: "/classement", label: "CLASSEMENT", icon: Trophy },
    { href: "/matchs", label: "MATCHS", icon: Swords },
    { href: "/historique", label: "HISTORIQUE", icon: History },
  ];

  if (isAdmin) {
    navItems.push({ href: "/admin", label: "ADMIN", icon: Shield });
  }

  const mobileItems = navItems;

  return (
    <>
      <header className="sticky top-0 z-50 px-4 pt-2 md:hidden">
        <div className="tp-nav-mobile-top">
          <Link href="/" className="tp-nav-mobile-brand">
            <Image
              src="/pp1-removebg-preview (1).png"
              alt="Logo KING League"
              width={78}
              height={78}
              priority
              className="h-10 w-auto object-contain opacity-95 drop-shadow-[0_0_18px_rgba(255,124,222,0.28)]"
            />
          </Link>

          {!isAuthenticated ? (
            <div className="tp-nav-mobile-auth">
              <Link href="/inscription" className="tp-nav-mobile-cta tp-nav-mobile-cta-primary">
                S&apos;inscrire
              </Link>
              <button onClick={() => signIn()} className="tp-nav-mobile-cta tp-nav-mobile-cta-secondary">
                <LogIn className="h-3.5 w-3.5" />
                <span>Se connecter</span>
              </button>
            </div>
          ) : (
            <div className="tp-nav-mobile-auth">
              <Link href="/profile" className={`tp-nav-mobile-profile ${pathname === "/profile" ? "tp-nav-mobile-profile-active" : ""}`} aria-label="Mon profil">
                <span className="text-[10px] font-black uppercase tracking-[0.18em]">WELCOME</span>
              </Link>
              <button onClick={() => signOut()} className="tp-nav-mobile-profile tp-nav-mobile-profile-logout" aria-label="Se deconnecter">
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          )}
        </div>
      </header>

      <header className="sticky top-0 z-40 hidden pt-1 md:block">
        <div className="mx-auto max-w-[1400px] px-4">
        <div className="tp-nav-shell px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center lg:min-w-[120px]">
              <Image
                src="/pp1-removebg-preview (1).png"
                alt="Logo KING League"
                width={92}
                height={92}
                priority
                className="h-11 w-auto object-contain opacity-95 drop-shadow-[0_0_18px_rgba(255,164,92,0.18)] lg:h-14"
              />
            </Link>

            <nav className="tp-nav-center hidden items-center md:flex">
              {navItems.map((item, idx) => {
                const active = item.isActive ?? pathname === item.href;
                const Icon = item.icon;

                return (
                  <div key={item.href} className="flex items-center gap-3">
                    <Link className={`tp-nav-link ${active ? "tp-nav-link-active" : ""}`} href={item.href}>
                      {active ? <motion.span layoutId="nav-active" className="tp-nav-active-bg" transition={{ type: "spring", stiffness: 360, damping: 30 }} /> : null}
                      <span className="relative z-10 inline-flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                    </Link>
                    {idx < navItems.length - 1 ? <span className="tp-nav-dot">•</span> : null}
                  </div>
                );
              })}
            </nav>

            <div className="flex min-w-fit items-center gap-2 md:ml-auto">
              {!isAuthenticated ? (
                <>
                  <Link href="/inscription" className="tp-nav-action tp-nav-action-primary tp-nav-action-mobile-primary">
                    S&apos;inscrire
                  </Link>
                  <button onClick={() => signIn()} className="tp-nav-action tp-nav-action-secondary tp-nav-action-mobile-secondary">
                    <LogIn className="mr-1 inline h-4 w-4" /> SE CONNECTER
                  </button>
                </>
              ) : (
                <>
                  <Link href="/profile" className="tp-nav-action tp-nav-action-primary tp-nav-action-mobile-primary inline-flex items-center gap-2">
                    <span>PROFIL</span>
                  </Link>
                  <div className="tp-nav-action tp-nav-action-secondary tp-nav-action-mobile-secondary inline-flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-300" />
                    <span>{credits}</span>
                  </div>
                  <button onClick={() => signOut()} className="tp-nav-action tp-nav-action-secondary tp-nav-action-mobile-secondary">
                    <LogOut className="mr-1 inline h-4 w-4" /> DÉCONNEXION
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        </div>
      </header>

      <nav className="tp-nav-mobile md:hidden" style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}>
        {mobileItems.map((item) => {
          const active = item.isActive ?? pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className={`tp-nav-mobile-link ${active ? "tp-nav-mobile-link-active" : ""}`}>
              <span className="tp-nav-mobile-icon-wrap">
                <Icon className="h-[1.15rem] w-[1.15rem]" />
              </span>
              <span className="tp-nav-mobile-text">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
