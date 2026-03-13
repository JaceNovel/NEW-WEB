import type { Metadata } from "next";

export const siteName = "KING League";
export const siteUrl = "https://kingleague.space";
export const logoPath = "/pp1-removebg-preview%20(1).png";
export const appIconPath = "/app-icon.png";
export const siteDescription = "KING League est la plateforme 1v1 Free Fire premium ou commence l'ascension du ROI, avec duels officiels, classement dynamique, credits instantanes et scene competitive haut de gamme.";
export const defaultKeywords = [
  "KING League",
  "King League Free Fire",
  "tournoi Free Fire",
  "1v1 Free Fire",
  "duel Free Fire",
  "competition Free Fire",
  "plateforme Free Fire",
  "ROI",
  "ascension du ROI",
  "kingleague.space",
];

type PageMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
};

function buildTitle(title: string) {
  return title === siteName ? title : `${title} | ${siteName}`;
}

export function buildPageMetadata({
  title,
  description,
  path = "/",
  keywords = [],
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const fullTitle = buildTitle(title);
  const metadataKeywords = Array.from(new Set([...defaultKeywords, ...keywords]));

  return {
    title,
    description,
    keywords: metadataKeywords,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
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
      title: fullTitle,
      description,
      images: ["/twitter-image"],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
        },
  };
}