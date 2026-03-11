import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "../styles/globals.css";

import Navbar from "@/components/Navbar";
import { Providers } from "@/components/Providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PRIME League | Tournoi 1v1 Free Fire",
    template: "%s | PRIME League",
  },
  applicationName: "PRIME League",
  description: "PRIME League est une plateforme de tournoi Free Fire 1v1 Spam / One Tap avec crédits, ROI, classement dynamique et boutique joueur.",
  keywords: ["PRIME League", "Prime League Free Fire", "tournoi Free Fire", "1v1 Free Fire", "ROI", "classement Free Fire"],
  openGraph: {
    title: "PRIME League",
    description: "Tournoi 1v1 Free Fire avec credits, ROI et systeme de progression PRIME League.",
    siteName: "PRIME League",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PRIME League",
    description: "Tournoi 1v1 Free Fire avec credits, ROI et systeme de progression PRIME League.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} tp-galaxy antialiased text-white relative overflow-x-hidden`}
      >
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
