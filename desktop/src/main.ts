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

/** Width of the new-password window's page, in pixels. */
const PASSWORD_WINDOW_WIDTH = 460;

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
// macOS manages color itself: there the switch would send sRGB colors
// unconverted to a wide-gamut display, which shows them oversaturated.
if (process.platform !== "darwin") {
  app.commandLine.appendSwitch("force-color-profile", "srgb");
  app.commandLine.appendSwitch("disable-features", "WaylandWpColorManagerV1");
}

let server: UtilityProcess | undefined;
let window: BrowserWindow | undefined;
let origin: string | undefined;
let passwordWindow: BrowserWindow | undefined;
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
      switch (message.type) {
        case "ready":
          resolve();
          break;
        case "error":
          reject(new Error(explain(message)));
          break;
        case "password-reset":
          showNewPassword(message.email, message.password);
          break;
        case "password-reset-failed":
          dialog.showErrorBox(
            "Nutria couldn't reset the password",
            message.message,
          );
          break;
      }
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
 * Asks the owner to confirm, then has the server process give their account
 * a new password. Running the app as the user who owns its data is the proof
 * of ownership, so nothing else is asked.
 *
 * @returns Once the request is sent, or the owner cancelled.
 */
async function confirmPasswordReset(): Promise<void> {
  if (!server) return;

  const options = {
    type: "warning",
    buttons: ["Reset password", "Cancel"],
    defaultId: 1,
    cancelId: 1,
    title: "Reset password",
    message: "Reset your Nutria password?",
    detail:
      "Nutria will give your account a new password and sign you out. Your data stays as it is.",
  } satisfies Electron.MessageBoxOptions;
  const { response } = window
    ? await dialog.showMessageBox(window, options)
    : await dialog.showMessageBox(options);
  if (response !== 0) return;

  server?.postMessage({ type: "reset-password" } satisfies WindowMessage);
}

/**
 * Shows the new password once, in a small window of the app's own, then
 * returns the main window to the sign-in screen: the reset ended every
 * session. A system dialog can't copy it on Wayland, where only a window the
 * user just clicked in may set the clipboard.
 *
 * @param email The account's email.
 * @param password Its new password.
 */
function showNewPassword(email: string, password: string): void {
  passwordWindow?.close();

  const child = new BrowserWindow({
    parent: window,
    modal: Boolean(window),
    // The page's size, not the frame's; the height is fitted to it below.
    useContentSize: true,
    width: PASSWORD_WINDOW_WIDTH,
    height: 280,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: "Your new password",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  passwordWindow = child;

  // The page has no links: it never navigates or opens windows.
  child.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  child.webContents.on("will-navigate", (event) => event.preventDefault());

  // Fit the height to the page, whose text wraps with the system's fonts.
  child.once("ready-to-show", async () => {
    try {
      const height: number = await child.webContents.executeJavaScript(
        "document.documentElement.scrollHeight",
      );
      child.setContentSize(PASSWORD_WINDOW_WIDTH, Math.ceil(height));
    } finally {
      child.show();
    }
  });
  child.on("closed", () => {
    passwordWindow = undefined;
    if (window && origin) void window.loadURL(`${origin}/login`);
  });

  void child.loadFile(path.join(__dirname, "password-window.html"), {
    query: { email, password },
  });
}

/**
 * The window's menu, hidden until Alt is pressed. It holds the password reset
 * and the keyboard shortcuts: copy and paste, reload, zoom and full screen.
 * On macOS it is the menu bar at the top of the screen, and starts with the
 * menu every app has there (About, Hide, Quit).
 *
 * @returns The menu.
 */
function buildMenu(): Menu {
  const reset: Electron.MenuItemConstructorOptions = {
    label: "Reset password…",
    click: () => void confirmPasswordReset(),
  };

  return Menu.buildFromTemplate([
    process.platform === "darwin"
      ? {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            reset,
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        }
      : {
          label: "Nutria",
          submenu: [reset, { type: "separator" }, { role: "quit" }],
        },
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
  // The app asks for no camera, location or notification access. Only the
  // new-password window may write to the clipboard, for its Copy button.
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) =>
      callback(
        permission === "clipboard-sanitized-write" &&
          webContents === passwordWindow?.webContents,
      ),
  );

  try {
    const { port, secret } = await loadSettings(app.getPath("userData"));
    await startServer(port, secret);
    origin = `http://${LOOPBACK}:${port}`;
    createWindow(origin);
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
