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
  error?: string;
};

export type SymbolHit = { code: string; name: string };

export type WidgetState = {
  symbols: string[];
  windowX: number | null;
  windowY: number | null;
};
