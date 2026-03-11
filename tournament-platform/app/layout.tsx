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
  title: "Tournoi 1v1 Free Fire — ROI",
  description: "Plateforme tournoi Free Fire 1v1 Spam / One Tap avec crédits et classement dynamique",
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
