const { app, BrowserWindow, nativeImage, shell } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

const appUrl = process.env.KING_LEAGUE_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://kingleague.space";
const iconPath = path.join(__dirname, "..", "public", "pp1-removebg-preview (1).png");
const splashPath = path.join(__dirname, "..", "public", "Design sans titre (1).png");

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");

let mainWindow = null;
let splashWindow = null;

function buildSplashMarkup() {
  const splashUrl = pathToFileURL(splashPath).href;

  return `<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>KING League</title>
      <style>
        :root {
          color-scheme: dark;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          overflow: hidden;
          background:
            radial-gradient(circle at top, rgba(255, 175, 97, 0.22), transparent 32%),
            radial-gradient(circle at bottom, rgba(91, 216, 255, 0.14), transparent 36%),
            linear-gradient(180deg, #090d1d, #03050e);
          font-family: system-ui, sans-serif;
          color: white;
        }
        .wrap {
          width: min(100vw, 460px);
          padding: 28px;
          text-align: center;
        }
        .card {
          position: relative;
          overflow: hidden;
          border-radius: 32px;
          border: 1px solid rgba(255, 214, 168, 0.18);
          background: linear-gradient(180deg, rgba(20, 16, 38, 0.88), rgba(6, 9, 20, 0.96));
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.42), 0 0 40px rgba(255, 169, 92, 0.14);
          padding: 20px;
        }
        .card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.08) 20%, transparent 42%);
          pointer-events: none;
        }
        .kicker {
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 197, 128, 0.26);
          background: rgba(255, 166, 88, 0.12);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 237, 214, 0.96);
        }
        .art {
          margin-top: 16px;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
        }
        .art img {
          display: block;
          width: 100%;
          height: auto;
          object-fit: cover;
        }
        .loader {
          width: 52px;
          height: 52px;
          margin: 18px auto 0;
          border-radius: 999px;
          border: 3px solid rgba(255, 255, 255, 0.12);
          border-top-color: #ffcb7b;
          border-right-color: #84d9ff;
          animation: spin 0.9s linear infinite;
          box-shadow: 0 0 24px rgba(255, 203, 123, 0.18);
        }
        h1 {
          margin: 18px 0 0;
          font-size: 30px;
          line-height: 1;
          letter-spacing: -0.05em;
        }
        p {
          margin: 10px 0 0;
          color: rgba(236, 241, 255, 0.72);
          font-size: 14px;
          line-height: 1.6;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      </style>
    </head>
    <body>
      <main class="wrap">
        <section class="card">
          <div class="kicker">KING League official app</div>
          <div class="art"><img src="${splashUrl}" alt="KING League splash" /></div>
          <div class="loader" aria-hidden="true"></div>
          <h1>KING League</h1>
          <p>Chargement de l'app officielle mobile et desktop.</p>
        </section>
      </main>
    </body>
  </html>`;
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 720,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    show: true,
    skipTaskbar: true,
  });

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildSplashMarkup())}`);
}

function createMainWindow() {
  const icon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#050816",
    icon: icon.isEmpty() ? undefined : icon,
    title: "KING League",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (!targetUrl.startsWith(appUrl)) {
      event.preventDefault();
      shell.openExternal(targetUrl);
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
  });

  mainWindow.webContents.on("did-fail-load", () => {
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html lang="fr"><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#050816;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:32px"><div><h1 style="margin:0 0 12px">KING League</h1><p style="margin:0;color:rgba(255,255,255,.72);line-height:1.6">Impossible de joindre l'URL applicative configurée.<br />Définis KING_LEAGUE_APP_URL avant de lancer le shell desktop.</p></div></body></html>`)}`);
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.show();
  });

  mainWindow.loadURL(appUrl);
}

app.whenReady().then(() => {
  createSplashWindow();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});