import { app, BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";
import { resolveApiKey, BACKEND_BASE_URL } from "./env";
import { loadState, saveState, WidgetState } from "./state";

const WINDOW_WIDTH = 360;
const WINDOW_HEIGHT = 460;
const INTERACTIVE_OFF_DELAY_MS = 180; // debounce before re-enabling click-through, avoids edge flicker
const WATCHDOG_INTERVAL_MS = 200;
const WATCHDOG_MARGIN_PX = 4;

let win: BrowserWindow | null = null;
let interactiveOffTimer: ReturnType<typeof setTimeout> | null = null;
let moveSaveTimer: ReturnType<typeof setTimeout> | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
// 目前是否已解除滑鼠穿透——renderer 貼齊視窗左上角，往左/往上一旦滑出視窗矩形
// 範圍，Windows 就完全不會再送任何滑鼠事件過來（往右/往下還在視窗範圍內、經過
// 空白透明區域，事件還收得到），單靠 renderer 收事件來判斷「有沒有離開」在往
// 左/上的方向會卡死。這裡在主行程用輪詢滑鼠的絕對座標當保險，不管方向都能抓到。
let isInteractive = false;

function apiHeaders(): Record<string, string> {
  const key = resolveApiKey();
  return key ? { "X-API-Key": key } : {};
}

function createWindow(): void {
  const state = loadState();
  const display = screen.getPrimaryDisplay().workArea;
  const x = state.windowX ?? display.x + display.width - WINDOW_WIDTH - 24;
  const y = state.windowY ?? display.y + 24;

  win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setAlwaysOnTop(true);
  win.setIgnoreMouseEvents(true, { forward: true });
  // Some Chromium versions reset mouse-event handling once the page finishes
  // loading; reapply here so click-through is guaranteed once content is up.
  win.webContents.on("did-finish-load", () => {
    win?.setIgnoreMouseEvents(true, { forward: true });
  });

  const devServerUrl = process.env.WIDGET_DEV_SERVER_URL;
  if (devServerUrl) {
    win.loadURL(devServerUrl);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  win.on("moved", () => {
    if (!win) return;
    const [wx, wy] = win.getPosition();
    if (moveSaveTimer) clearTimeout(moveSaveTimer);
    moveSaveTimer = setTimeout(() => {
      const current = loadState();
      saveState({ ...current, windowX: wx, windowY: wy });
    }, 400);
  });

  win.on("closed", () => {
    win = null;
    if (watchdogTimer) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
  });

  startWatchdog();
}

function startWatchdog(): void {
  if (watchdogTimer) clearInterval(watchdogTimer);
  watchdogTimer = setInterval(() => {
    if (!win || !isInteractive) return;
    const cursor = screen.getCursorScreenPoint();
    const bounds = win.getBounds();
    const inside =
      cursor.x >= bounds.x - WATCHDOG_MARGIN_PX &&
      cursor.x <= bounds.x + bounds.width + WATCHDOG_MARGIN_PX &&
      cursor.y >= bounds.y - WATCHDOG_MARGIN_PX &&
      cursor.y <= bounds.y + bounds.height + WATCHDOG_MARGIN_PX;
    if (!inside) {
      isInteractive = false;
      if (interactiveOffTimer) {
        clearTimeout(interactiveOffTimer);
        interactiveOffTimer = null;
      }
      win.setIgnoreMouseEvents(true, { forward: true });
      win.webContents.send("widget:force-leave");
    }
  }, WATCHDOG_INTERVAL_MS);
}

function registerIpcHandlers(): void {
  ipcMain.handle("widget:get-quotes", async (_event, symbols: string[]) => {
    const query = encodeURIComponent((symbols || []).join(","));
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/widget/quotes?symbols=${query}`, {
        headers: apiHeaders()
      });
      if (!response.ok) {
        return { fugle_enabled: false, quotes: [], error: `HTTP ${response.status}` };
      }
      return await response.json();
    } catch (err) {
      return { fugle_enabled: false, quotes: [], error: String(err) };
    }
  });

  ipcMain.handle("widget:search-symbols", async (_event, q: string) => {
    if (!q || !q.trim()) return [];
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/widget/symbols/search?q=${encodeURIComponent(q)}`);
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  });

  ipcMain.handle("widget:load-state", () => loadState());

  ipcMain.handle("widget:save-state", (_event, patch: Partial<WidgetState>) => {
    // Shallow-merge onto the state currently on disk (rather than trusting the
    // renderer's copy) so a stale windowX/Y in the renderer never clobbers a
    // position just written by the window's own "moved" handler below.
    const merged = { ...loadState(), ...patch };
    saveState(merged);
  });

  ipcMain.handle("widget:set-interactive", (_event, interactive: boolean) => {
    if (!win) return;
    isInteractive = interactive;
    if (interactive) {
      if (interactiveOffTimer) {
        clearTimeout(interactiveOffTimer);
        interactiveOffTimer = null;
      }
      win.setIgnoreMouseEvents(false);
    } else {
      if (interactiveOffTimer) clearTimeout(interactiveOffTimer);
      interactiveOffTimer = setTimeout(() => {
        win?.setIgnoreMouseEvents(true, { forward: true });
      }, INTERACTIVE_OFF_DELAY_MS);
    }
  });

  ipcMain.handle("widget:quit", () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
