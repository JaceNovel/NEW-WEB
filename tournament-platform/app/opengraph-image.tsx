import { readFile } from "node:fs/promises";

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "KING League - L'ascension du ROI commence ici";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

async function getLogoDataUrl() {
  const file = await readFile(`${process.cwd()}/public/pp1-removebg-preview (1).png`);
  return `data:image/png;base64,${file.toString("base64")}`;
}

export default async function OpenGraphImage() {
  const logoSrc = await getLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "radial-gradient(circle at 18% 18%, rgba(255,166,86,0.28), transparent 24%), radial-gradient(circle at 82% 24%, rgba(86,214,255,0.18), transparent 22%), linear-gradient(145deg, #020202 0%, #080816 38%, #100624 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(115deg, transparent 0%, rgba(255,218,148,0.1) 18%, transparent 32%, transparent 68%, rgba(108,215,255,0.08) 100%)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "48px 58px",
            border: "1px solid rgba(255,194,128,0.22)",
            margin: "26px",
            borderRadius: "34px",
            background: "linear-gradient(180deg, rgba(17,10,34,0.72), rgba(5,7,18,0.72))",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 740 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 40,
                    padding: "0 18px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,193,126,0.34)",
                    background: "linear-gradient(180deg, rgba(255,154,76,0.22), rgba(86,30,17,0.14))",
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: 2.4,
                    textTransform: "uppercase",
                    color: "#ffe6bf",
                  }}
                >
                  KING League
                </div>
                <div style={{ display: "flex", fontSize: 22, color: "#9fdcff", opacity: 0.92 }}>kingleague.space</div>
              </div>
              <div style={{ display: "flex", fontSize: 68, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2.8 }}>
                L&apos;ascension du ROI commence ici.
              </div>
              <div style={{ display: "flex", fontSize: 28, lineHeight: 1.45, color: "rgba(240,243,255,0.82)", maxWidth: 760 }}>
                Classement dynamique, duels 1v1 Free Fire, credits instantanes et experience premium signee KING League.
              </div>
            </div>

            <div
              style={{
                width: 260,
                height: 260,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 36,
                background: "radial-gradient(circle at 50% 25%, rgba(255,190,115,0.18), rgba(255,255,255,0) 62%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                border: "1px solid rgba(255,210,143,0.14)",
              }}
            >
              <img src={logoSrc} alt="KING League" width="220" height="220" style={{ objectFit: "contain" }} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                "Classement ROI",
                "Defis 1v1",
                "Credits automatiques",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    minHeight: 42,
                    padding: "0 18px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))",
                    fontSize: 18,
                    color: "rgba(248,250,255,0.9)",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", fontSize: 20, color: "rgba(255,230,191,0.94)", letterSpacing: 1.6 }}>
              ROI • Credits • King Experience
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}