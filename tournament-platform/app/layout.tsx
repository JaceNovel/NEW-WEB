import type { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";

import "../styles/globals.css";

import Navbar from "@/components/Navbar";
import AppInstallPopup from "@/components/AppInstallPopup";
import PwaRegistrar from "@/components/PwaRegistrar";
import SponsorFooter from "@/components/SponsorFooter";
import { Providers } from "@/components/Providers";
import SponsorTicker from "@/components/SponsorTicker";
import { authOptions } from "@/lib/auth";
import { appIconPath, defaultKeywords, logoPath, siteDescription, siteName, siteUrl } from "@/lib/seo";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "KING League | Tournoi 1v1 Free Fire",
    template: "%s | KING League",
  },
  applicationName: siteName,
  description: siteDescription,
  keywords: defaultKeywords,
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  creator: siteName,
  publisher: siteName,
  referrer: "origin-when-cross-origin",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: appIconPath, type: "image/png" },
    ],
    shortcut: [appIconPath],
    apple: [appIconPath],
  },
  openGraph: {
    title: siteName,
    description: "L'ascension du ROI commence ici sur KING League. Duels 1v1 Free Fire, classement vivant, credits instantanes et experience competitive premium.",
    url: siteUrl,
    siteName,
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "KING League - L'ascension du ROI commence ici",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: "KING League propulse vos duels 1v1 Free Fire avec une scene premium, un ROI vivant et des credits instantanes.",
    images: ["/twitter-image"],
  },
  appleWebApp: {
    capable: true,
    title: siteName,
    statusBarStyle: "black-translucent",
  },
  category: "gaming",
};

export const viewport: Viewport = {
  themeColor: "#050816",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}${logoPath}`,
    description: siteDescription,
    slogan: "L'ascension du ROI commence ici",
    sameAs: [siteUrl],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    alternateName: "KING League Free Fire",
    url: siteUrl,
    description: siteDescription,
  };

  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-startup-image" href="/Design%20sans%20titre%20(1).png" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-GL5VMT7B3C" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} tp-galaxy antialiased text-white relative overflow-x-hidden`}
      >
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-GL5VMT7B3C');`}
        </Script>
        <Providers session={session}>
          <PwaRegistrar />
          <AppInstallPopup />
          <Navbar />
          <SponsorTicker />
          {children}
          <SponsorFooter />
        </Providers>
      </body>
    </html>
  );
}
