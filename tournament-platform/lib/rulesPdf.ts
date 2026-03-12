import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

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

type PdfImageAsset = {
  width: number;
  height: number;
  colorData: Buffer;
  alphaData: Buffer;
};

type PdfObject = string | Buffer;

const PRIME_MARK_URL = "https://img.icons8.com/?size=100&id=LWzqKcfS2RVS&format=png&color=000000";
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function sanitizePdfText(value: string) {
  return escapePdfText(value.normalize("NFKD").replace(/[^\x20-\x7E]/g, ""));
}

function drawText(font: "F1" | "F2" | "F3", size: number, x: number, y: number, text: string, color?: [number, number, number]) {
  const colorCommand = color ? `${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)} rg\n` : "";
  return `${colorCommand}BT\n/${font} ${size} Tf\n1 0 0 1 ${x} ${y} Tm\n(${sanitizePdfText(text)}) Tj\nET\n`;
}

function drawRect(x: number, y: number, width: number, height: number, color: [number, number, number]) {
  return `${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)} rg\n${x} ${y} ${width} ${height} re f\n`;
}

function drawStrokeRect(x: number, y: number, width: number, height: number, color: [number, number, number], lineWidth = 1) {
  return `${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)} RG\n${lineWidth} w\n${x} ${y} ${width} ${height} re S\n`;
}

function drawLine(x1: number, y1: number, x2: number, y2: number, color: [number, number, number], lineWidth = 1) {
  return `${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)} RG\n${lineWidth} w\n${x1} ${y1} m ${x2} ${y2} l S\n`;
}

function drawRule(font: "F1" | "F2", y: number, text: string) {
  return `${drawText("F2", 11, 64, y, "-", [0.96, 0.77, 0.46])}${drawText(font, 11, 80, y, text, [0.93, 0.93, 0.98])}`;
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function buildPdf(objects: PdfObject[]) {
  const buffers: Buffer[] = [Buffer.from("%PDF-1.4\n%\x80\x80\x80\x80\n", "binary")];
  const offsets: number[] = [0];
  let cursor = buffers[0].length;

  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index];
    const payload: Buffer = typeof object === "string" ? Buffer.from(object, "utf8") : object;
    offsets.push(cursor);
    const header = Buffer.from(`${index + 1} 0 obj\n`, "utf8");
    const footer = Buffer.from("\nendobj\n", "utf8");
    buffers.push(header, payload, footer);
    cursor += header.length + payload.length + footer.length;
  }

  const xrefOffset = cursor;
  const xrefParts = [Buffer.from(`xref\n0 ${objects.length + 1}\n`, "utf8"), Buffer.from("0000000000 65535 f \n", "utf8")];

  for (let index = 1; index < offsets.length; index += 1) {
    xrefParts.push(Buffer.from(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`, "utf8"));
  }

  xrefParts.push(Buffer.from(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`, "utf8"));
  return Buffer.concat([...buffers, ...xrefParts]);
}

function paethPredictor(left: number, up: number, upLeft: number) {
  const predictor = left + up - upLeft;
  const leftDelta = Math.abs(predictor - left);
  const upDelta = Math.abs(predictor - up);
  const upLeftDelta = Math.abs(predictor - upLeft);
  if (leftDelta <= upDelta && leftDelta <= upLeftDelta) return left;
  if (upDelta <= upLeftDelta) return up;
  return upLeft;
}

function parsePngAsset(buffer: Buffer): PdfImageAsset {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Unsupported logo format: only PNG is supported.");
  }

  let cursor = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  while (cursor < buffer.length) {
    const length = buffer.readUInt32BE(cursor);
    cursor += 4;
    const chunkType = buffer.toString("ascii", cursor, cursor + 4);
    cursor += 4;
    const chunkData = buffer.subarray(cursor, cursor + length);
    cursor += length + 4;

    if (chunkType === "IHDR") {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      bitDepth = chunkData[8] ?? 0;
      colorType = chunkData[9] ?? 0;
      const interlace = chunkData[12] ?? 0;
      if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
        throw new Error("Unsupported PNG asset. Expected non-interlaced 8-bit RGBA image.");
      }
    }

    if (chunkType === "IDAT") {
      idatChunks.push(chunkData);
    }

    if (chunkType === "IEND") {
      break;
    }
  }

  const inflated = inflateSync(Buffer.concat(idatChunks));
  const stride = width * 4;
  const rowLength = stride + 1;
  const rgbRows: Buffer[] = [];
  const alphaRows: Buffer[] = [];
  let prevRow = Buffer.alloc(stride);

  for (let row = 0; row < height; row += 1) {
    const rowStart = row * rowLength;
    const filter = inflated[rowStart] ?? 0;
    const rawRow = Buffer.from(inflated.subarray(rowStart + 1, rowStart + 1 + stride));

    for (let index = 0; index < stride; index += 1) {
      const left = index >= 4 ? rawRow[index - 4] ?? 0 : 0;
      const up = prevRow[index] ?? 0;
      const upLeft = index >= 4 ? prevRow[index - 4] ?? 0 : 0;

      if (filter === 1) rawRow[index] = (rawRow[index] + left) & 0xff;
      if (filter === 2) rawRow[index] = (rawRow[index] + up) & 0xff;
      if (filter === 3) rawRow[index] = (rawRow[index] + Math.floor((left + up) / 2)) & 0xff;
      if (filter === 4) rawRow[index] = (rawRow[index] + paethPredictor(left, up, upLeft)) & 0xff;
    }

    const rgbRow = Buffer.alloc(1 + width * 3);
    const alphaRow = Buffer.alloc(1 + width);
    rgbRow[0] = 0;
    alphaRow[0] = 0;

    for (let pixel = 0; pixel < width; pixel += 1) {
      const source = pixel * 4;
      const rgb = 1 + pixel * 3;
      rgbRow[rgb] = rawRow[source] ?? 0;
      rgbRow[rgb + 1] = rawRow[source + 1] ?? 0;
      rgbRow[rgb + 2] = rawRow[source + 2] ?? 0;
      alphaRow[1 + pixel] = rawRow[source + 3] ?? 255;
    }

    rgbRows.push(rgbRow);
    alphaRows.push(alphaRow);
    prevRow = rawRow;
  }

  return {
    width,
    height,
    colorData: deflateSync(Buffer.concat(rgbRows)),
    alphaData: deflateSync(Buffer.concat(alphaRows)),
  };
}

async function loadIconAsset() {
  const response = await fetch(PRIME_MARK_URL, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error("Unable to fetch association icon for KING PDF.");
  }
  return Buffer.from(await response.arrayBuffer());
}

async function loadPdfAssets() {
  const publicDir = join(process.cwd(), "public");
  const [leftLogo, rightLogo, markLogo] = await Promise.all([
    readFile(join(publicDir, "WhatsApp_Image_2026-03-12_at_12.25.53-removebg-preview.png")),
    readFile(join(publicDir, "pp1-removebg-preview (1).png")),
    loadIconAsset(),
  ]);

  return {
    left: parsePngAsset(leftLogo),
    right: parsePngAsset(rightLogo),
    mark: parsePngAsset(markLogo),
  };
}

function drawImage(name: string, asset: PdfImageAsset, x: number, y: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / asset.width, maxHeight / asset.height);
  const width = asset.width * scale;
  const height = asset.height * scale;
  const xOffset = x + (maxWidth - width) / 2;
  const yOffset = y + (maxHeight - height) / 2;
  return `q\n${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${xOffset.toFixed(2)} ${yOffset.toFixed(2)} cm\n/${name} Do\nQ\n`;
}

function createImageObjects(asset: PdfImageAsset, smaskObjectNumber: number) {
  const imageObject = Buffer.concat([
    Buffer.from(
      `<< /Type /XObject /Subtype /Image /Width ${asset.width} /Height ${asset.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${asset.width} >> /SMask ${smaskObjectNumber} 0 R /Length ${asset.colorData.length} >>\nstream\n`,
      "utf8",
    ),
    asset.colorData,
    Buffer.from("\nendstream", "utf8"),
  ]);

  const smaskObject = Buffer.concat([
    Buffer.from(
      `<< /Type /XObject /Subtype /Image /Width ${asset.width} /Height ${asset.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 1 /BitsPerComponent 8 /Columns ${asset.width} >> /Length ${asset.alphaData.length} >>\nstream\n`,
      "utf8",
    ),
    asset.alphaData,
    Buffer.from("\nendstream", "utf8"),
  ]);

  return { imageObject, smaskObject };
}

export async function createRulesPdf(payload: RulesPdfPayload) {
  const assets = await loadPdfAssets();
  const issuedAt = payload.issuedAt ?? new Date();
  const issuedAtLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(issuedAt);

  const recipientSeed = `${payload.recipientId ?? payload.pseudo}|${payload.freefireId}|${issuedAt.toISOString()}`;
  const reference = `KING-${createHash("sha256").update(recipientSeed).digest("hex").slice(0, 12).toUpperCase()}`;
  const recipientLine = `Document emis pour ${payload.pseudo} - compte Free Fire ${payload.freefireId}`;
  const watermark = `KING LEAGUE CONFIDENTIEL ${payload.pseudo.toUpperCase()}`;
  const premiumStamp = `${payload.pseudo.toUpperCase()}  ${reference}  KING LEAGUE`;

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

  const controlLines = [
    "Filigrane nominatif integre dans la mise en page et l'empreinte numerique.",
    "Reference unique KING necessaire pour toute verification officielle.",
    "Document reserve au titulaire du compte et a la moderation KING.",
  ];

  const footerNotice = wrapText(
    "Filigrane numerique actif. Toute copie non autorisee reste traquable via la reference unique et l'identite du titulaire.",
    96,
  );

  let content = "";
  content += drawRect(0, 0, 595, 842, [0.050, 0.024, 0.100]);
  content += drawRect(22, 22, 551, 798, [0.084, 0.040, 0.150]);
  content += drawRect(22, 728, 551, 92, [0.136, 0.060, 0.230]);
  content += drawRect(38, 96, 519, 612, [0.112, 0.056, 0.196]);
  content += drawStrokeRect(22, 22, 551, 798, [0.980, 0.760, 0.430], 1.5);
  content += drawStrokeRect(38, 96, 519, 612, [0.565, 0.392, 0.765], 0.8);
  content += drawLine(50, 660, 545, 660, [0.980, 0.760, 0.430], 1);
  content += drawLine(50, 714, 545, 714, [0.430, 0.320, 0.610], 0.8);

  content += drawImage("ImLeft", assets.left, 46, 738, 132, 70);
  content += drawImage("ImMark", assets.mark, 244, 742, 92, 62);
  content += drawImage("ImRight", assets.right, 404, 734, 132, 74);

  content += "q\n0.285 0.285 -0.959 0.959 190 230 cm\n";
  content += drawText("F2", 30, 0, 0, watermark, [0.34, 0.24, 0.44]);
  content += "Q\n";
  content += "q\n0.285 0.285 -0.959 0.959 265 130 cm\n";
  content += drawText("F2", 24, 0, 0, reference, [0.26, 0.18, 0.36]);
  content += "Q\n";
  content += "q\n0.999 0.032 -0.032 0.999 66 118 cm\n";
  content += drawText("F1", 8, 0, 0, premiumStamp, [0.37, 0.30, 0.48]);
  content += "Q\n";

  content += drawText("F2", 24, 206, 780, "KING LEAGUE", [0.99, 0.90, 0.76]);
  content += drawText("F1", 11, 194, 760, "Reglement officiel personnalise et signe numeriquement", [0.88, 0.87, 0.96]);
  content += drawText("F2", 17, 56, 690, "Attestation individuelle des regles du tournoi", [0.98, 0.78, 0.45]);
  content += drawText("F1", 11, 56, 670, recipientLine, [0.93, 0.93, 0.98]);
  content += drawText("F1", 10, 56, 648, `Date d'emission : ${issuedAtLabel}`, [0.73, 0.76, 0.86]);
  content += drawText("F1", 10, 330, 648, `Reference : ${reference}`, [0.73, 0.76, 0.86]);

  content += drawRect(56, 540, 214, 96, [0.145, 0.078, 0.240]);
  content += drawStrokeRect(56, 540, 214, 96, [0.980, 0.760, 0.430], 0.8);
  content += drawText("F2", 12, 72, 612, "Titulaire KING", [0.98, 0.78, 0.45]);

  let summaryY = 590;
  for (const line of summaryLines) {
    content += drawText("F1", 10, 72, summaryY, line, [0.95, 0.95, 0.98]);
    summaryY -= 14;
  }

  content += drawRect(286, 540, 253, 96, [0.132, 0.072, 0.226]);
  content += drawStrokeRect(286, 540, 253, 96, [0.565, 0.392, 0.765], 0.8);
  content += drawText("F2", 12, 302, 612, "Alliance certifiee", [0.98, 0.78, 0.45]);
  content += drawText("F3", 16, 386, 598, "KING x Association", [0.93, 0.93, 0.98]);

  let controlY = 576;
  for (const line of controlLines) {
    for (const wrappedLine of wrapText(line, 33)) {
      content += drawText("F1", 10, 302, controlY, wrappedLine, [0.93, 0.93, 0.98]);
      controlY -= 14;
    }
    controlY -= 4;
  }

  content += drawText("F2", 14, 56, 500, "Clauses principales", [0.98, 0.78, 0.45]);

  let ruleY = 476;
  for (const line of ruleLines) {
    for (const wrappedLine of wrapText(line, 82)) {
      content += drawRule("F1", ruleY, wrappedLine);
      ruleY -= 18;
    }
    ruleY -= 6;
  }

  content += drawRect(56, 176, 483, 90, [0.122, 0.065, 0.214]);
  content += drawStrokeRect(56, 176, 483, 90, [0.970, 0.720, 0.370], 0.8);
  content += drawText("F2", 13, 72, 238, "Signature KING", [0.98, 0.78, 0.45]);
  content += drawText("F3", 17, 72, 216, "Signe electroniquement par la direction KING League", [0.95, 0.95, 0.98]);
  content += drawText("F1", 10, 72, 196, "Cachet numerique actif - reproduction interdite", [0.80, 0.82, 0.90]);
  content += drawText("F1", 10, 72, 178, `Empreinte : ${reference}`, [0.80, 0.82, 0.90]);
  content += drawText("F2", 14, 396, 214, "KING", [0.99, 0.90, 0.76]);
  content += drawText("F1", 10, 392, 196, "Official Compliance Seal", [0.80, 0.82, 0.90]);

  let noticeY = 134;
  for (const line of footerNotice) {
    content += drawText("F1", 9, 56, noticeY, line, [0.88, 0.88, 0.94]);
    noticeY -= 14;
  }

  const leftObjects = createImageObjects(assets.left, 8);
  const markObjects = createImageObjects(assets.mark, 10);
  const rightObjects = createImageObjects(assets.right, 12);

  const streamObject = Buffer.concat([
    Buffer.from(`<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n`, "utf8"),
    Buffer.from(content, "utf8"),
    Buffer.from("endstream", "utf8"),
  ]);

  return buildPdf([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> /XObject << /ImLeft 7 0 R /ImMark 9 0 R /ImRight 11 0 R >> >> /Contents 13 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>",
    leftObjects.imageObject,
    leftObjects.smaskObject,
    markObjects.imageObject,
    markObjects.smaskObject,
    rightObjects.imageObject,
    rightObjects.smaskObject,
    streamObject,
  ]);
}
