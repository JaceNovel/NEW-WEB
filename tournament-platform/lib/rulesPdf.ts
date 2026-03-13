import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { PDFDocument, StandardFonts, degrees, rgb, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";

type RulesPdfPayload = {
  pseudo: string;
  freefireId: string;
  role: string;
  status: string;
  gameMode: string;
  credits: number;
  issuedAt?: Date;
  recipientId?: string;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

const colors = {
  page: rgb(0.04, 0.02, 0.1),
  panel: rgb(0.1, 0.05, 0.18),
  header: rgb(0.15, 0.08, 0.27),
  card: rgb(0.16, 0.08, 0.28),
  border: rgb(0.98, 0.76, 0.43),
  softBorder: rgb(0.47, 0.33, 0.68),
  title: rgb(0.99, 0.9, 0.76),
  accent: rgb(0.98, 0.78, 0.45),
  text: rgb(0.93, 0.93, 0.98),
  muted: rgb(0.76, 0.78, 0.88),
  watermark: rgb(0.28, 0.21, 0.38),
};

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-");
}

function pdfY(top: number, height = 0) {
  return PAGE_HEIGHT - top - height;
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    let chunk = "";
    for (const char of word) {
      const next = `${chunk}${char}`;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        chunk = next;
      } else {
        if (chunk) lines.push(chunk);
        chunk = char;
      }
    }
    current = chunk;
  }

  if (current) lines.push(current);
  return lines;
}

function drawTextBlock(page: PDFPage, font: PDFFont, text: string, options: {
  x: number;
  top: number;
  size: number;
  maxWidth: number;
  color: ReturnType<typeof rgb>;
  lineHeight?: number;
}) {
  const lineHeight = options.lineHeight ?? options.size * 1.35;
  const lines = wrapText(font, text, options.size, options.maxWidth);

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: pdfY(options.top + index * lineHeight, options.size),
      size: options.size,
      font,
      color: options.color,
    });
  });

  return options.top + lines.length * lineHeight;
}

function measureTextBlockHeight(font: PDFFont, text: string, size: number, maxWidth: number, lineHeight = size * 1.35) {
  return wrapText(font, text, size, maxWidth).length * lineHeight;
}

function drawBulletList(page: PDFPage, font: PDFFont, items: string[], options: {
  x: number;
  top: number;
  width: number;
  size: number;
  bulletGap?: number;
  rowGap?: number;
}) {
  const bulletGap = options.bulletGap ?? 16;
  const rowGap = options.rowGap ?? 8;
  let cursorTop = options.top;

  for (const item of items) {
    page.drawText("-", {
      x: options.x,
      y: pdfY(cursorTop, options.size),
      size: options.size,
      font,
      color: colors.accent,
    });

    const endTop = drawTextBlock(page, font, item, {
      x: options.x + bulletGap,
      top: cursorTop,
      size: options.size,
      maxWidth: options.width - bulletGap,
      color: colors.text,
      lineHeight: options.size * 1.55,
    });

    cursorTop = endTop + rowGap;
  }

  return cursorTop;
}

async function loadPngAssets(pdf: PDFDocument) {
  const publicDir = join(process.cwd(), "public");
  const [primeLogoBytes, leagueLogoBytes] = await Promise.all([
    readFile(join(publicDir, "WhatsApp_Image_2026-03-12_at_12.25.53-removebg-preview.png")),
    readFile(join(publicDir, "pp1-removebg-preview (1).png")),
  ]);

  const [primeLogo, leagueLogo] = await Promise.all([
    pdf.embedPng(primeLogoBytes),
    pdf.embedPng(leagueLogoBytes),
  ]);

  return { primeLogo, leagueLogo };
}

function drawContainedImage(page: PDFPage, image: PDFImage, options: { x: number; top: number; width: number; height: number }) {
  const scale = Math.min(options.width / image.width, options.height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = options.x + (options.width - drawWidth) / 2;
  const y = pdfY(options.top, options.height) + (options.height - drawHeight) / 2;

  page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });
}

export async function createRulesPdf(payload: RulesPdfPayload) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const { primeLogo, leagueLogo } = await loadPngAssets(pdf);

  const issuedAt = payload.issuedAt ?? new Date();
  const issuedAtLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(issuedAt);

  const seed = `${payload.recipientId ?? payload.pseudo}|${payload.freefireId}|${issuedAt.toISOString()}`;
  const reference = `KING-${createHash("sha256").update(seed).digest("hex").slice(0, 12).toUpperCase()}`;

  const summaryLines = [
    `Titulaire : ${payload.pseudo}`,
    `Identifiant Free Fire : ${payload.freefireId}`,
    `Statut tournoi : ${payload.status}`,
    `Mode principal : ${payload.gameMode}`,
    `Credits disponibles : ${payload.credits}`,
    `Role plateforme : ${payload.role}`,
  ];

  const ruleLines = [
    "Le tournoi KING League se joue en duel 1v1 sur Free Fire.",
    "Chaque resultat valide met a jour les credits, les points et le classement officiel.",
    "Un joueur elimine ne peut plus reintegrer le tableau principal sans validation KING.",
    "Toute fraude, substitution de compte ou montage de resultat entraine une exclusion immediate.",
    "Ce document est personnel, non cessible et lie au compte mentionne ci-dessus.",
    "Toute reproduction, diffusion ou falsification invalide automatiquement cette attestation.",
  ];

  const verificationLines = [
    "Filigrane nominatif integre dans la mise en page et l'empreinte numerique.",
    "Reference unique KING necessaire pour toute verification officielle.",
    "Document reserve au titulaire du compte et a la moderation KING League.",
  ];

  const contentPanelTop = 160;
  const contentPanelHeight = 654;
  const leftCardX = 52;
  const leftCardWidth = 222;
  const rightCardX = 290;
  const rightCardWidth = 253;
  const cardsTop = 264;
  const summaryTextSize = 9.6;
  const summaryLineHeight = 13.5;
  const summaryLineGap = 3;
  const summaryTextWidth = leftCardWidth - 36;
  const verificationTextSize = 10.1;
  const verificationLineHeight = 14;
  const verificationTextWidth = 215;

  const summaryContentHeight = summaryLines.reduce((total, line, index) => {
    const lineHeight = measureTextBlockHeight(fontRegular, line, summaryTextSize, summaryTextWidth, summaryLineHeight);
    return total + lineHeight + (index === summaryLines.length - 1 ? 0 : summaryLineGap);
  }, 0);

  const verificationIntroHeight = measureTextBlockHeight(fontItalic, "Conformite numerique KING League", 10.8, verificationTextWidth, 14);
  const verificationContentHeight = verificationLines.reduce((total, line, index) => {
    const lineHeight = measureTextBlockHeight(fontRegular, line, verificationTextSize, verificationTextWidth, verificationLineHeight);
    return total + lineHeight + (index === verificationLines.length - 1 ? 0 : 6);
  }, 0);

  const cardHeight = Math.max(
    76 + summaryContentHeight,
    82 + verificationIntroHeight + verificationContentHeight,
  );

  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: colors.page });
  page.drawRectangle({
    x: 16,
    y: 16,
    width: PAGE_WIDTH - 32,
    height: PAGE_HEIGHT - 32,
    color: colors.panel,
    borderColor: colors.border,
    borderWidth: 1.4,
  });
  page.drawRectangle({ x: 16, y: pdfY(26, 118), width: PAGE_WIDTH - 32, height: 118, color: colors.header });
  page.drawRectangle({
    x: 34,
    y: pdfY(contentPanelTop, contentPanelHeight),
    width: PAGE_WIDTH - 68,
    height: contentPanelHeight,
    color: rgb(0.11, 0.05, 0.2),
    borderColor: colors.softBorder,
    borderWidth: 0.9,
  });

  drawContainedImage(page, primeLogo, { x: 24, top: 40, width: 150, height: 74 });
  drawContainedImage(page, leagueLogo, { x: PAGE_WIDTH - 164, top: 38, width: 132, height: 74 });

  page.drawText("KING LEAGUE", {
    x: 198,
    y: pdfY(44, 28),
    size: 24,
    font: fontBold,
    color: colors.title,
  });
  page.drawText("Reglement officiel personnalise et signe numeriquement", {
    x: 194,
    y: pdfY(78, 12),
    size: 11.5,
    font: fontRegular,
    color: colors.muted,
  });

  page.drawText("ATTESTATION SOLO KING LEAGUE", {
    x: 162,
    y: pdfY(486, 24),
    size: 24,
    font: fontBold,
    color: colors.watermark,
    rotate: degrees(56),
    opacity: 0.14,
  });

  page.drawText("Attestation Solo des regles du tournoi", {
    x: 52,
    y: pdfY(174, 19),
    size: 18,
    font: fontBold,
    color: colors.accent,
  });

  page.drawText(`Document emis pour ${payload.pseudo} - compte Free Fire ${payload.freefireId}`, {
    x: 52,
    y: pdfY(204, 12),
    size: 11.5,
    font: fontRegular,
    color: colors.text,
  });

  page.drawLine({
    start: { x: 48, y: pdfY(232) },
    end: { x: 547, y: pdfY(232) },
    thickness: 1,
    color: colors.border,
  });

  page.drawText(`Date d'emission : ${issuedAtLabel}`, {
    x: 52,
    y: pdfY(240, 10),
    size: 10,
    font: fontRegular,
    color: colors.muted,
  });
  page.drawText(`Reference : ${reference}`, {
    x: 344,
    y: pdfY(240, 10),
    size: 10,
    font: fontRegular,
    color: colors.muted,
  });

  page.drawRectangle({
    x: leftCardX,
    y: pdfY(cardsTop, cardHeight),
    width: leftCardWidth,
    height: cardHeight,
    color: colors.card,
    borderColor: colors.border,
    borderWidth: 0.9,
  });
  page.drawRectangle({
    x: rightCardX,
    y: pdfY(cardsTop, cardHeight),
    width: rightCardWidth,
    height: cardHeight,
    color: colors.card,
    borderColor: colors.softBorder,
    borderWidth: 0.9,
  });

  page.drawText("Titulaire KING", {
    x: 70,
    y: pdfY(282, 12),
    size: 12,
    font: fontBold,
    color: colors.accent,
  });

  let summaryTop = 308;
  for (const line of summaryLines) {
    summaryTop = drawTextBlock(page, fontRegular, line, {
      x: 70,
      top: summaryTop,
      size: summaryTextSize,
      maxWidth: summaryTextWidth,
      color: colors.text,
      lineHeight: summaryLineHeight,
    }) + summaryLineGap;
  }

  page.drawText("Verification officielle", {
    x: 308,
    y: pdfY(282, 12),
    size: 12,
    font: fontBold,
    color: colors.accent,
  });
  drawTextBlock(page, fontItalic, "Conformite numerique KING League", {
    x: 308,
    top: 304,
    size: 10.8,
    maxWidth: verificationTextWidth,
    color: colors.text,
    lineHeight: 14,
  });

  let verificationTop = 334;
  for (const line of verificationLines) {
    verificationTop = drawTextBlock(page, fontRegular, line, {
      x: 308,
      top: verificationTop,
      size: verificationTextSize,
      maxWidth: verificationTextWidth,
      color: colors.text,
      lineHeight: verificationLineHeight,
    }) + 6;
  }

  const clausesTitleTop = cardsTop + cardHeight + 28;

  page.drawText("Clauses principales", {
    x: 52,
    y: pdfY(clausesTitleTop, 14),
    size: 14,
    font: fontBold,
    color: colors.accent,
  });

  const rulesEndTop = drawBulletList(page, fontRegular, ruleLines, {
    x: 62,
    top: clausesTitleTop + 24,
    width: 470,
    size: 10.4,
    bulletGap: 18,
    rowGap: 6,
  });

  const footerBoxTop = Math.max(rulesEndTop + 22, 668);
  const footerBoxHeight = 104;

  page.drawRectangle({
    x: 52,
    y: pdfY(footerBoxTop, footerBoxHeight),
    width: 491,
    height: footerBoxHeight,
    color: colors.card,
    borderColor: colors.border,
    borderWidth: 0.9,
  });

  page.drawText("Signature KING", {
    x: 72,
    y: pdfY(footerBoxTop + 20, 13),
    size: 13,
    font: fontBold,
    color: colors.accent,
  });
  const signatureBottom = drawTextBlock(page, fontItalic, "Signe electroniquement par la direction KING League", {
    x: 72,
    top: footerBoxTop + 48,
    size: 11.2,
    maxWidth: 220,
    color: colors.text,
    lineHeight: 15,
  });
  page.drawText("Cachet numerique actif - reproduction interdite", {
    x: 72,
    y: pdfY(signatureBottom + 4, 10),
    size: 10,
    font: fontRegular,
    color: colors.muted,
  });
  page.drawText(`Empreinte : ${reference}`, {
    x: 72,
    y: pdfY(signatureBottom + 22, 10),
    size: 10,
    font: fontRegular,
    color: colors.muted,
  });

  page.drawText("Verification officielle", {
    x: 370,
    y: pdfY(footerBoxTop + 20, 13),
    size: 13,
    font: fontBold,
    color: colors.title,
  });
  let footerRightTop = footerBoxTop + 48;
  footerRightTop = drawTextBlock(page, fontRegular, "Document conforme au circuit KING League", {
    x: 370,
    top: footerRightTop,
    size: 10.3,
    maxWidth: 145,
    color: colors.text,
    lineHeight: 14,
  }) + 6;
  drawTextBlock(page, fontRegular, "Controle numerique via la reference unique", {
    x: 370,
    top: footerRightTop,
    size: 10.3,
    maxWidth: 145,
    color: colors.text,
    lineHeight: 14,
  });

  drawTextBlock(page, fontRegular, "Filigrane numerique actif. Toute copie non autorisee reste traquable via la reference unique et l'identite du titulaire.", {
    x: 52,
    top: footerBoxTop + footerBoxHeight + 14,
    size: 9,
    maxWidth: 490,
    color: colors.muted,
    lineHeight: 12,
  });

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}
