import type { SymbolHit, WidgetQuotesResponse, WidgetState } from "./types";

export {};

declare global {
  interface Window {
    widgetAPI: {
      getQuotes(symbols: string[]): Promise<WidgetQuotesResponse>;
      searchSymbols(q: string): Promise<SymbolHit[]>;
      loadState(): Promise<WidgetState>;
      saveState(patch: Partial<WidgetState>): Promise<void>;
      setInteractive(interactive: boolean): Promise<void>;
      quit(): Promise<void>;
      onForceLeave(callback: () => void): () => void;
    };
  }
}
