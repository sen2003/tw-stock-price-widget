import { contextBridge, ipcRenderer } from "electron";

export type WidgetQuote = {
  symbol: string;
  name: string;
  deal_price: number | null;
  prev_close: number | null;
  change: number | null;
  change_percent: number | null;
  total_volume: number | null;
  source: string;
};

export type WidgetQuotesResponse = {
  fugle_enabled: boolean;
  quotes: WidgetQuote[];
};

export type SymbolHit = { code: string; name: string };

export type WidgetState = {
  symbols: string[];
  windowX: number | null;
  windowY: number | null;
};

contextBridge.exposeInMainWorld("widgetAPI", {
  getQuotes: (symbols: string[]): Promise<WidgetQuotesResponse> => ipcRenderer.invoke("widget:get-quotes", symbols),
  searchSymbols: (q: string): Promise<SymbolHit[]> => ipcRenderer.invoke("widget:search-symbols", q),
  loadState: (): Promise<WidgetState> => ipcRenderer.invoke("widget:load-state"),
  saveState: (patch: Partial<WidgetState>): Promise<void> => ipcRenderer.invoke("widget:save-state", patch),
  setInteractive: (interactive: boolean): Promise<void> => ipcRenderer.invoke("widget:set-interactive", interactive),
  quit: (): Promise<void> => ipcRenderer.invoke("widget:quit"),
  // 主行程用輪詢滑鼠座標偵測到「游標已經離開視窗範圍」時會推這個事件過來，
  // 當保險機制用（見 electron/main.ts 的 startWatchdog）。
  onForceLeave: (callback: () => void): (() => void) => {
    const listener = () => callback();
    ipcRenderer.on("widget:force-leave", listener);
    return () => ipcRenderer.removeListener("widget:force-leave", listener);
  }
});
