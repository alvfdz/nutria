/**
 * The desktop app's window process (Electron's main process). It starts the
 * background process that runs the database and Nutria's server
 * (`server.ts`), then shows the app in a window. The window is a plain
 * browser view of `http://127.0.0.1:<port>`: it gets no Node.js access and
 * no preload script.
 */
import path from "node:path";

import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  session,
  shell,
  utilityProcess,
  type UtilityProcess,
} from "electron";

import { ENV, type ServerMessage, type WindowMessage } from "./messages.ts";
import { loadSettings, LOOPBACK } from "./settings.ts";

/** How long the server process gets to close the database on quit. */
const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * Folder holding `server/` and `migrations/`: Electron's resources folder
 * once packaged, the build output (`desktop/dist`) when run from a checkout.
 */
const resourcesDir = app.isPackaged ? process.resourcesPath : __dirname;

// Colors are sRGB and go to the screen as they are, as in a browser tab.
// Left alone, Chromium tags its Wayland surface with a color profile and the
// compositor re-encodes it for the display, which lifts the dark theme's
// near-black background (#09090b came out as #111113).
app.commandLine.appendSwitch("force-color-profile", "srgb");
app.commandLine.appendSwitch("disable-features", "WaylandWpColorManagerV1");

let server: UtilityProcess | undefined;
let window: BrowserWindow | undefined;
let quitting = false;

/**
 * Words a startup failure for someone who will never see a log.
 *
 * @param message The server process's message.
 * @returns What the error dialog says.
 */
function explain(message: Extract<ServerMessage, { type: "error" }>): string {
  if (message.code === "DATABASE_IS_NEWER") {
    return "Your data was saved by a newer version of Nutria. Install the latest version to open it.";
  }
  return message.message;
}

/**
 * Starts the server process and waits for it to serve the app.
 *
 * @param port Port the app listens on.
 * @param secret Cookie-signing secret.
 * @returns Once the app answers.
 * @throws {Error} If the process reports a failure or exits first.
 */
function startServer(port: number, secret: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = utilityProcess.fork(path.join(__dirname, "server.mjs"), [], {
      serviceName: "Nutria server",
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(port),
        BETTER_AUTH_SECRET: secret,
        [ENV.dataDir]: app.getPath("userData"),
        [ENV.serverDir]: path.join(resourcesDir, "server"),
        [ENV.migrationsDir]: path.join(resourcesDir, "migrations"),
      },
    });
    server = child;

    child.on("message", (message: ServerMessage) => {
      if (message.type === "ready") resolve();
      else reject(new Error(explain(message)));
    });
    child.once("exit", (code) => {
      server = undefined;
      reject(
        new Error(`The Nutria server stopped unexpectedly (code ${code}).`),
      );
      // Without its server the window is a dead page.
      if (!quitting) app.quit();
    });
  });
}

/**
 * Opens the app's window. Links that leave the app, such as the Open Food
 * Facts attribution, open in the system browser instead of in the window.
 *
 * @param origin The app's origin.
 */
function createWindow(origin: string): void {
  window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 360,
    minHeight: 560,
    title: "Nutria",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const isApp = (url: string) => URL.parse(url)?.origin === origin;
  const openOutside = (url: string) => {
    if (/^https?:$/.test(URL.parse(url)?.protocol ?? "")) {
      void shell.openExternal(url);
    }
  };

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!isApp(url)) openOutside(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (isApp(url)) return;
    event.preventDefault();
    openOutside(url);
  });

  window.once("ready-to-show", () => window?.show());
  window.on("closed", () => {
    window = undefined;
  });

  void window.loadURL(origin);
}

/**
 * The window's menu, hidden until Alt is pressed. It exists for its keyboard
 * shortcuts: copy and paste, reload, zoom and full screen.
 *
 * @returns The menu.
 */
function buildMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: "Nutria", submenu: [{ role: "quit" }] },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ]);
}

/** Loads the settings, starts the server and opens the window. */
async function start(): Promise<void> {
  Menu.setApplicationMenu(buildMenu());
  // The app asks for no camera, location or notification access.
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );

  try {
    const { port, secret } = await loadSettings(app.getPath("userData"));
    await startServer(port, secret);
    createWindow(`http://${LOOPBACK}:${port}`);
  } catch (error) {
    if (quitting) return;
    dialog.showErrorBox("Nutria couldn't start", (error as Error).message);
    app.quit();
  }
}

// Two copies writing to the same database files would damage them.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });

  app.on("window-all-closed", () => app.quit());

  // Quitting waits for the server process to close the database.
  app.on("before-quit", (event) => {
    quitting = true;
    const child = server;
    if (!child) return;

    event.preventDefault();
    const timeout = setTimeout(() => child.kill(), SHUTDOWN_TIMEOUT_MS);
    child.once("exit", () => {
      clearTimeout(timeout);
      app.quit();
    });
    child.postMessage({ type: "shutdown" } satisfies WindowMessage);
  });

  // A logout or shutdown ends the app with a signal: quit the same way, so
  // the database is closed first.
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => app.quit());
  }

  void app.whenReady().then(start);
}
